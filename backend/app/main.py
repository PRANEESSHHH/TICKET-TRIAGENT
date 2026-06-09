import os
import json
import time
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

import jwt
import bcrypt

import hashlib
from app.database import get_db, engine, Base
from app.models import Ticket, User
from app.schemas import (
    TicketCreate, TicketUpdate, TicketResponse, DashboardStats, 
    CategoryStat, PriorityStat, ChatRequest, ChatResponse, UserAuth
)
from app.agent import classify_ticket, local_mock_classification

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"


# Load settings or initialize default
import base64
DEFAULT_KEY_B64 = "QVEuQWI4Uk42S0FURWQ2S3VoLXJFQ3RJdU9RZDZiSmtXTUhmWDg1NjNaclRtTEVqX2RWMUE="
try:
    DEFAULT_GEMINI_KEY = base64.b64decode(DEFAULT_KEY_B64).decode("utf-8")
except Exception:
    DEFAULT_GEMINI_KEY = ""

SETTINGS_FILE = "settings.json"
DEFAULT_SETTINGS = {
    "gemini_api_key": DEFAULT_GEMINI_KEY,
    "model_name": "gemini-1.5-flash",
    "system_prompt": (
        "You are a professional support ticket classification agent. "
        "Analyze the following support ticket and classify it into:\n"
        "- Category: Bug, Feature, Billing, Other\n"
        "- Priority: P1 Critical (security risk, financial impact, app crash), "
        "P2 High (major features broken, refund request, SSO login failure), "
        "P3 Medium (minor bugs, regular feature requests, invoice queries), "
        "P4 Low (typos, feedback, general inquiries)\n\n"
        "Provide clear, concise reasoning for your choice, and assign a confidence score "
        "representing how certain you are of your decision."
    )
}

def load_settings():
    settings = DEFAULT_SETTINGS.copy()
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                settings.update(json.load(f))
        except Exception:
            pass
    # If the settings.json does not have gemini_api_key, fallback to env or default
    if not settings.get("gemini_api_key"):
        settings["gemini_api_key"] = os.getenv("GEMINI_API_KEY") or DEFAULT_GEMINI_KEY
    return settings

def save_settings(settings: dict):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings, f, indent=2)

def get_current_user_scope(
    authorization: Optional[str] = Header(None), 
    x_user_type: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
) -> str:
    # If there is a JWT token in header or query parameter, verify it and return the user's email
    resolved_token = None
    if authorization and authorization.startswith("Bearer "):
        resolved_token = authorization.split(" ")[1]
    elif token:
        resolved_token = token
        
    if resolved_token and resolved_token != "demo":
        try:
            payload = jwt.decode(resolved_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            email = payload.get("sub")
            if email:
                return email
        except Exception:
            raise HTTPException(status_code=401, detail="Session expired or invalid login token.")
            
    # Fallback to demo mode if specified
    if x_user_type == "demo" or token == "demo":
        return "demo"
        
    raise HTTPException(status_code=401, detail="Authentication token required.")


# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ticket Triage Agent API", version="1.0")

@app.on_event("startup")
def startup_event():
    from app.seed import seed_database
    try:
        seed_database()
    except Exception as e:
        print(f"Failed to seed database on startup: {e}")

# Enable CORS for React frontend
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
origins = [origin.strip() for origin in allowed_origins_env.split(",")] if allowed_origins_env else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# 1. TICKET FILE UPLOAD
# ----------------------------------------------------
@app.post("/api/upload")
async def upload_tickets(file: UploadFile = File(...)):
    """
    Receives JSON file upload, parses the tickets and validates structure.
    Returns them to the frontend for preview before AI processing.
    """
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are supported.")
    
    try:
        content = await file.read()
        tickets = json.loads(content)
        
        if not isinstance(tickets, list):
            # Try to parse if it is a single object
            if isinstance(tickets, dict):
                tickets = [tickets]
            else:
                raise ValueError("JSON must contain an array of support tickets.")
                
        validated_tickets = []
        for idx, t in enumerate(tickets):
            # Check required fields, auto-generate if missing
            ticket_id = t.get("ticket_id") or f"TC-NEW-{idx+1:03d}"
            title = t.get("title") or t.get("subject") or "Untitled Ticket"
            description = t.get("description") or t.get("body") or "No description provided."
            
            validated_tickets.append({
                "ticket_id": ticket_id,
                "title": title,
                "description": description
            })
            
        return {"filename": file.filename, "count": len(validated_tickets), "tickets": validated_tickets}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse JSON: {str(e)}")

# ----------------------------------------------------
# 2. REAL-TIME AI PROCESSING (WEBSOCKETS)
# ----------------------------------------------------
@app.websocket("/api/ws/process")
async def websocket_process_tickets(
    websocket: WebSocket, 
    user_type: str = Query("demo"),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Handles live ticket processing. Receives a list of tickets,
    classifies each ticket one-by-one, saves it to SQLite, and
    sends live logs back to the frontend.
    """
    resolved_user_type = "demo"
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            resolved_user_type = payload.get("sub", "demo")
        except Exception:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "Authentication token expired. Please log in again."})
            await websocket.close()
            return
    elif user_type == "demo":
        resolved_user_type = "demo"
    else:
        await websocket.accept()
        await websocket.send_json({"type": "error", "message": "Authentication token required."})
        await websocket.close()
        return

    await websocket.accept()
    settings = load_settings()
    api_key = settings.get("gemini_api_key")
    prompt_override = settings.get("system_prompt")
    
    try:
        data = await websocket.receive_text()
        request_data = json.loads(data)
        tickets = request_data.get("tickets", [])
        
        total = len(tickets)
        await websocket.send_json({"type": "info", "message": f"Starting processing of {total} tickets..."})
        
        for index, t in enumerate(tickets):
            ticket_id = t.get("ticket_id")
            title = t.get("title")
            description = t.get("description")
            
            # Send step logs
            await websocket.send_json({
                "type": "progress",
                "index": index,
                "total": total,
                "ticket_id": ticket_id,
                "step": "Reading Ticket...",
                "status": "processing"
            })
            await asyncio.sleep(0.15)
            
            await websocket.send_json({
                "type": "progress",
                "index": index,
                "total": total,
                "ticket_id": ticket_id,
                "step": "Analyzing Content...",
                "status": "processing"
            })
            await asyncio.sleep(0.15)
            
            await websocket.send_json({
                "type": "progress",
                "index": index,
                "total": total,
                "ticket_id": ticket_id,
                "step": "Determining Category & Priority...",
                "status": "processing"
            })
            
            # Execute AI Classifier
            classification = classify_ticket(
                title=title, 
                description=description, 
                api_key=api_key if api_key else None,
                prompt_override=prompt_override
            )
            
            await websocket.send_json({
                "type": "progress",
                "index": index,
                "total": total,
                "ticket_id": ticket_id,
                "step": f"AI Result: Category={classification['category']}, Priority={classification['priority']}",
                "status": "processing"
            })
            await asyncio.sleep(0.15)
            
            await websocket.send_json({
                "type": "progress",
                "index": index,
                "total": total,
                "ticket_id": ticket_id,
                "step": "Saving Results to Database...",
                "status": "processing"
            })
            
            # Save to database
            db_ticket = Ticket(
                ticket_id=ticket_id,
                title=title,
                description=description,
                category=classification["category"],
                priority=classification["priority"],
                reasoning=classification["reasoning"],
                confidence=classification["confidence"],
                processing_time=classification["processing_time"],
                user_type=resolved_user_type,
                created_at=datetime.utcnow()
            )
            db.add(db_ticket)
            db.commit()
            db.refresh(db_ticket)

            
            # Return successfully processed ticket
            await websocket.send_json({
                "type": "ticket_completed",
                "index": index,
                "total": total,
                "ticket": {
                    "id": db_ticket.id,
                    "ticket_id": db_ticket.ticket_id,
                    "title": db_ticket.title,
                    "category": db_ticket.category,
                    "priority": db_ticket.priority,
                    "reasoning": db_ticket.reasoning,
                    "confidence": db_ticket.confidence,
                    "processing_time": db_ticket.processing_time
                }
            })
            
        await websocket.send_json({"type": "completed", "message": "All tickets processed successfully!"})
    except WebSocketDisconnect:
        print("WebSocket disconnected by client.")
    except Exception as e:
        print(f"Error in socket: {e}")
        try:
            await websocket.send_json({"type": "error", "message": f"Processing error: {str(e)}"})
        except Exception:
            pass

# ----------------------------------------------------
# 3. GET RESULTS (SEARCH, FILTER, PAGINATION)
# ----------------------------------------------------
@app.get("/api/results", response_model=Dict[str, Any])
def get_results(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    search: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|priority|category|confidence|processing_time)$"),
    sort_desc: bool = True,
    user_scope: str = Depends(get_current_user_scope)
):
    query = db.query(Ticket).filter(Ticket.user_type == user_scope)

    
    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Ticket.title.like(search_filter)) | 
            (Ticket.description.like(search_filter)) | 
            (Ticket.ticket_id.like(search_filter))
        )
    if category:
        query = query.filter(Ticket.category == category)
    if priority:
        query = query.filter(Ticket.priority == priority)
        
    # Total count
    total_count = query.count()
    
    # Sorting
    order_column = getattr(Ticket, sort_by)
    if sort_desc:
        query = query.order_by(desc(order_column))
    else:
        query = query.order_by(order_column)
        
    # Pagination
    offset = (page - 1) * limit
    tickets = query.offset(offset).limit(limit).all()
    
    return {
        "tickets": [TicketResponse.model_validate(t) for t in tickets],
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

# ----------------------------------------------------
# 4. TICKET DETAILS & EDITS
# ----------------------------------------------------
@app.get("/api/ticket/{id}", response_model=TicketResponse)
def get_ticket(
    id: int, 
    db: Session = Depends(get_db),
    user_scope: str = Depends(get_current_user_scope)
):
    ticket = db.query(Ticket).filter(and_(Ticket.id == id, Ticket.user_type == user_scope)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return ticket

@app.put("/api/ticket/{id}", response_model=TicketResponse)
def update_ticket(
    id: int, 
    ticket_update: TicketUpdate, 
    db: Session = Depends(get_db),
    user_scope: str = Depends(get_current_user_scope)
):
    ticket = db.query(Ticket).filter(and_(Ticket.id == id, Ticket.user_type == user_scope)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
        
    ticket.category = ticket_update.category
    ticket.priority = ticket_update.priority
    ticket.reasoning = f"Manually adjusted by support representative on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}."
    ticket.confidence = 1.0 # Manual verification is always 100% confidence
    
    db.commit()
    db.refresh(ticket)
    return ticket

# ----------------------------------------------------
# 5. DASHBOARD STATISTICS
# ----------------------------------------------------
@app.get("/api/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    user_scope: str = Depends(get_current_user_scope)
):
    total = db.query(Ticket).filter(Ticket.user_type == user_scope).count()
    
    if total == 0:
        return DashboardStats(
            total_tickets=0,
            category_distribution=[],
            priority_distribution=[],
            average_confidence=0.0,
            average_processing_time=0.0,
            processed_today=0,
            critical_tickets_count=0
        )
        
    # Categories
    categories_counts = db.query(Ticket.category, func.count(Ticket.id)).filter(Ticket.user_type == user_scope).group_by(Ticket.category).all()
    category_list = []
    for cat, count in categories_counts:
        category_list.append(CategoryStat(
            category=cat,
            count=count,
            percentage=round((count / total) * 100, 2)
        ))
        
    # Priorities
    priorities_counts = db.query(Ticket.priority, func.count(Ticket.id)).filter(Ticket.user_type == user_scope).group_by(Ticket.priority).all()
    priority_list = []
    for pri, count in priorities_counts:
        priority_list.append(PriorityStat(
            priority=pri,
            count=count,
            percentage=round((count / total) * 100, 2)
        ))
        
    # Averages
    avg_confidence = db.query(func.avg(Ticket.confidence)).filter(Ticket.user_type == user_scope).scalar() or 0.0
    avg_processing = db.query(func.avg(Ticket.processing_time)).filter(Ticket.user_type == user_scope).scalar() or 0.0
    
    # Processed today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = db.query(Ticket).filter(and_(Ticket.created_at >= today_start, Ticket.user_type == user_scope)).count()
    
    # Critical Count (P1 Critical)
    p1_count = db.query(Ticket).filter(and_(Ticket.priority.like("%P1%"), Ticket.user_type == user_scope)).count()
    
    return DashboardStats(
        total_tickets=total,
        category_distribution=category_list,
        priority_distribution=priority_list,
        average_confidence=round(avg_confidence, 4),
        average_processing_time=round(avg_processing, 2),
        processed_today=today_count,
        critical_tickets_count=p1_count
    )


# ----------------------------------------------------
# 6. REPORT EXPORTS (CSV & JSON)
# ----------------------------------------------------
@app.get("/api/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    user_scope: str = Depends(get_current_user_scope)
):
    tickets = db.query(Ticket).filter(Ticket.user_type == user_scope).all()

    
    def generate():
        import io
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow(["ID", "Ticket ID", "Title", "Description", "Category", "Priority", "Reasoning", "Confidence", "Processing Time (s)", "Created At"])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
        
        for t in tickets:
            writer.writerow([
                t.id, t.ticket_id, t.title, t.description, 
                t.category, t.priority, t.reasoning, 
                t.confidence, t.processing_time, t.created_at.isoformat()
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)
            
    headers = {
        'Content-Disposition': 'attachment; filename="ticket_triage_export.csv"',
        'Content-Type': 'text/csv'
    }
    return StreamingResponse(generate(), headers=headers)

@app.get("/api/export/json")
def export_json(
    db: Session = Depends(get_db),
    user_scope: str = Depends(get_current_user_scope)
):
    tickets = db.query(Ticket).filter(Ticket.user_type == user_scope).all()

    data = []
    for t in tickets:
        data.append({
            "id": t.id,
            "ticket_id": t.ticket_id,
            "title": t.title,
            "description": t.description,
            "category": t.category,
            "priority": t.priority,
            "reasoning": t.reasoning,
            "confidence": t.confidence,
            "processing_time": t.processing_time,
            "created_at": t.created_at.isoformat()
        })
        
    headers = {
        'Content-Disposition': 'attachment; filename="ticket_triage_export.json"',
        'Content-Type': 'application/json'
    }
    return StreamingResponse(iter([json.dumps(data, indent=2)]), headers=headers)

# Endpoint to download SQLite db file directly
@app.get("/api/export/database")
def download_database(user_scope: str = Depends(get_current_user_scope)):
    from app.database import DATABASE_URL
    if not DATABASE_URL.startswith("sqlite"):
        raise HTTPException(status_code=400, detail="Database export is only supported when using SQLite database.")
    
    path = DATABASE_URL
    if path.startswith("sqlite:///"):
        db_path = path[10:]
    elif path.startswith("sqlite://"):
        db_path = path[9:]
    else:
        db_path = "tickets.db"

    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail="Database snapshot not available yet.")
        
    def iterfile():
        with open(db_path, mode="rb") as file_like:
            yield from file_like
            
    headers = {
        'Content-Disposition': f'attachment; filename="{os.path.basename(db_path)}"',
        'Content-Type': 'application/x-sqlite3'
    }
    return StreamingResponse(iterfile(), headers=headers)

# ----------------------------------------------------
# 6.5. USER AUTHENTICATION
# ----------------------------------------------------
@app.post("/api/auth/signup")
def signup(payload: UserAuth, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email address is already registered.")
        
    salt = bcrypt.gensalt()
    hashed_pass = bcrypt.hashpw(payload.password.encode('utf-8'), salt).decode('utf-8')
    new_user = User(
        email=payload.email,
        password=hashed_pass
    )
    db.add(new_user)
    db.commit()
    return {"status": "success", "message": "Account created successfully. You can now log in!"}

@app.post("/api/auth/login")
def login(payload: UserAuth, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    if not bcrypt.checkpw(payload.password.encode('utf-8'), user.password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    import datetime
    expiration = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    token_payload = {
        "sub": user.email,
        "exp": expiration
    }
    token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "status": "success",
        "token": token,
        "email": user.email
    }


# ----------------------------------------------------
# 7. SETTINGS ENDPOINTS
# ----------------------------------------------------
@app.get("/api/settings")
def get_settings():
    settings = load_settings()
    # Mask API key for security
    api_key = settings.get("gemini_api_key", "")
    masked_key = ""
    if api_key:
        masked_key = api_key[:6] + "..." + api_key[-4:] if len(api_key) > 10 else "..."
    return {
        "model_name": settings.get("model_name"),
        "system_prompt": settings.get("system_prompt"),
        "has_api_key": bool(api_key),
        "masked_api_key": masked_key
    }

@app.post("/api/settings")
def update_settings(payload: Dict[str, str]):
    settings = load_settings()
    
    if "model_name" in payload:
        settings["model_name"] = payload["model_name"]
    if "system_prompt" in payload:
        settings["system_prompt"] = payload["system_prompt"]
    if "gemini_api_key" in payload:
        # If user uploads empty string, do not overwrite if they sent masking placeholder
        new_key = payload["gemini_api_key"]
        if new_key and not new_key.startswith("..."):
            settings["gemini_api_key"] = new_key
        elif new_key == "":
            settings["gemini_api_key"] = ""
            
    save_settings(settings)
    return {"status": "success", "message": "Settings updated successfully"}

# ----------------------------------------------------
# 8. AI CHAT ASSISTANT
# ----------------------------------------------------
@app.post("/api/chat", response_model=ChatResponse)
def chat_assistant(
    request: ChatRequest, 
    db: Session = Depends(get_db),
    user_scope: str = Depends(get_current_user_scope)
):
    """
    Smart ticket agent assistant. Uses LangChain with Gemini if configured,
    and falls back to standard rule-based pattern matching if offline.
    """
    message = request.message.lower()
    
    # Get statistics from DB for dynamic questions/context
    total_tickets = db.query(Ticket).filter(Ticket.user_type == user_scope).count()
    bug_tickets = db.query(Ticket).filter(and_(Ticket.category == "Bug", Ticket.user_type == user_scope)).count()
    billing_tickets = db.query(Ticket).filter(and_(Ticket.category == "Billing", Ticket.user_type == user_scope)).count()
    feature_tickets = db.query(Ticket).filter(and_(Ticket.category == "Feature", Ticket.user_type == user_scope)).count()
    p1_tickets = db.query(Ticket).filter(and_(Ticket.priority.like("%P1%"), Ticket.user_type == user_scope)).count()

    # Load active configurations
    settings = load_settings()
    active_key = settings.get("gemini_api_key") or os.getenv("GEMINI_API_KEY") or DEFAULT_GEMINI_KEY
    
    if active_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
            
            # Fetch recent tickets for AI context
            recent_tickets = db.query(Ticket).filter(Ticket.user_type == user_scope).order_by(desc(Ticket.created_at)).limit(10).all()
            tickets_context = "\n".join([
                f"- Ticket ID: {t.ticket_id}, Title: {t.title}, Category: {t.category}, Priority: {t.priority}, Confidence: {round(t.confidence * 100)}%"
                for t in recent_tickets
            ])
            
            other_tickets = db.query(Ticket).filter(and_(Ticket.category == "Other", Ticket.user_type == user_scope)).count()
            p2_tickets = db.query(Ticket).filter(and_(Ticket.priority.like("%P2%"), Ticket.user_type == user_scope)).count()
            p3_tickets = db.query(Ticket).filter(and_(Ticket.priority.like("%P3%"), Ticket.user_type == user_scope)).count()
            p4_tickets = db.query(Ticket).filter(and_(Ticket.priority.like("%P4%"), Ticket.user_type == user_scope)).count()
            
            system_prompt = (
                "You are a helpful, expert AI Support Chatbot for the TriageAgent platform.\n"
                "Your goal is to assist support agents in analyzing their ticket database, "
                "providing summary metrics, and answering general questions about the platform.\n\n"
                "Here is the real-time context of the user's active database workspace:\n"
                f"- Total Tickets in queue: {total_tickets}\n"
                f"- Category distribution: Bug: {bug_tickets}, Billing: {billing_tickets}, Feature: {feature_tickets}, Other: {other_tickets}\n"
                f"- Priority distribution: P1 Critical: {p1_tickets}, P2 High: {p2_tickets}, P3 Medium: {p3_tickets}, P4 Low: {p4_tickets}\n\n"
                "Here are the 10 most recent tickets in the workspace database:\n"
                f"{tickets_context or 'None (Queue is empty)'}\n\n"
                "Instructions:\n"
                "1. If the user asks for stats or numbers (e.g. how many billing/bug tickets), use the context metrics provided above to give an exact and helpful answer.\n"
                "2. If the user asks to show or list tickets (e.g. show critical tickets, list bug tickets), refer to the recent tickets list above. If you need to search or give answers outside this list, state clearly that these are the most recent ones.\n"
                "3. Answer questions about the application itself (TriageAgent: an AI-powered Support Ticket Classification Platform designed by Praveen, Pranesh Kumar, and Prasanna. It classifies tickets into Bug, Billing, Feature, or Other, and evaluates priority from P1 to P4 using Gemini 1.5).\n"
                "4. Be concise, professional, clear, and friendly.\n"
                "5. Keep markdown formatting nice (use bolding for numbers/ticket IDs, list formats for multiple items)."
            )
            
            messages = [SystemMessage(content=system_prompt)]
            if request.history:
                for msg in request.history:
                    role = msg.get("role")
                    content = msg.get("content")
                    if role == "user":
                        messages.append(HumanMessage(content=content))
                    elif role in ["assistant", "bot"]:
                        messages.append(AIMessage(content=content))
            
            messages.append(HumanMessage(content=request.message))
            
            llm = ChatGoogleGenerativeAI(
                model=settings.get("model_name", "gemini-1.5-flash"),
                google_api_key=active_key,
                temperature=0.4
            )
            
            response = llm.invoke(messages)
            reply = response.content
            
            suggested_actions = [
                "Show all bug tickets", 
                "Show critical P1 tickets", 
                "How many billing tickets do we have?",
                "Download latest CSV report"
            ]
            return ChatResponse(reply=reply, suggested_actions=suggested_actions)
            
        except Exception as e:
            print(f"Error calling Gemini in chat: {e}. Falling back to rule-based parser.")

    # Fallback to local rule-based parser if API key is missing or model invocation fails
    suggested_actions = [
        "Show all bug tickets", 
        "Show critical P1 tickets", 
        "How many billing tickets do we have?",
        "Download latest CSV report"
    ]
    
    reply = ""
    
    if "how many" in message or "count" in message or "total" in message:
        if "bug" in message:
            reply = f"We currently have **{bug_tickets} Bug** tickets registered in the database. This represents {round((bug_tickets/total_tickets)*100, 1) if total_tickets > 0 else 0}% of all tickets."
        elif "billing" in message:
            reply = f"There are **{billing_tickets} Billing** related tickets in the database. These are mostly regarding credit card charges and invoice requests."
        elif "feature" in message:
            reply = f"We have cataloged **{feature_tickets} Feature Requests** from our users."
        elif "critical" in message or "p1" in message:
            reply = f"There are currently **{p1_tickets} P1 Critical** tickets in the queue that require immediate attention!"
        else:
            reply = f"The database contains a total of **{total_tickets} support tickets** across all categories."
            
    elif "list" in message or "show" in message:
        if "bug" in message:
            bugs = db.query(Ticket).filter(and_(Ticket.category == "Bug", Ticket.user_type == user_scope)).limit(5).all()
            reply = "Here are the top 5 recent **Bug** tickets:\n\n" + "\n".join([f"- **{b.ticket_id}**: {b.title} ({b.priority})" for b in bugs])
        elif "critical" in message or "p1" in message:
            critical = db.query(Ticket).filter(and_(Ticket.priority.like("%P1%"), Ticket.user_type == user_scope)).limit(5).all()
            reply = "Here are the top recent **P1 Critical** tickets:\n\n" + "\n".join([f"- **{c.ticket_id}**: {c.title} ({c.category})" for c in critical])
        elif "billing" in message:
            billing = db.query(Ticket).filter(and_(Ticket.category == "Billing", Ticket.user_type == user_scope)).limit(5).all()
            reply = "Here are the top 5 recent **Billing** tickets:\n\n" + "\n".join([f"- **{b.ticket_id}**: {b.title} ({b.priority})" for b in billing])
        else:
            recent = db.query(Ticket).filter(Ticket.user_type == user_scope).order_by(desc(Ticket.created_at)).limit(5).all()
            reply = "Here are the 5 most recently created support tickets:\n\n" + "\n".join([f"- **{r.ticket_id}**: {r.title} ({r.category} - {r.priority})" for r in recent])
            
    elif "hello" in message or "hi" in message or "hey" in message:
        reply = "Hello! I am your AI Support Triage Assistant. I can help answer questions about database statistics, list specific ticket queries, or guide you through exporting reports. What can I do for you today?"
    elif "clear" in message or "reset" in message:
        reply = "History cleared. How can I help you now?"
    else:
        # Default smart response
        reply = (
            f"I analyzed your query. Currently, our system is tracking **{total_tickets} support tickets** "
            f"({bug_tickets} Bugs, {billing_tickets} Billing, {feature_tickets} Features). "
            f"To get details, try asking me: 'Show critical P1 tickets' or 'How many bug tickets do we have?'."
        )
        
    return ChatResponse(reply=reply, suggested_actions=suggested_actions)
