# Deployment Guide: Ticket Triage Agent Platform

This guide explains how to prepare, bundle, and deploy the **Ticket Triage Agent** platform to production environments.

---

## 1. Preparing the Codebase for Production

Currently, the React frontend contains hardcoded references to `http://localhost:8000`. To make the application deployable, we need to make these URLs dynamic or configurable.

### Option A: Relative Routing (Recommended for Single-Domain Hosting)
If you host the frontend and backend on the same domain/server (or proxy them through Nginx/FastAPI), you can use relative URLs. This automatically scales to any domain or protocol (HTTP/HTTPS, WS/WSS).

1. **Frontend Base URL (`frontend/src/main.jsx`)**:
   ```javascript
   // Change:
   axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
   ```

2. **WebSocket URL (`frontend/src/pages/Processing.jsx`)**:
   ```javascript
   // Change:
   const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
   const host = import.meta.env.VITE_API_BASE_URL 
     ? import.meta.env.VITE_API_BASE_URL.replace(/^https?:\/\//, '') 
     : window.location.host;
   const socket = new WebSocket(`${wsProtocol}//${host}/api/ws/process?user_type=${userType}`);
   ```

3. **Report Download Routes (`frontend/src/pages/Reports.jsx` & `frontend/src/pages/Results.jsx`)**:
   ```javascript
   const API_BASE = import.meta.env.VITE_API_BASE_URL || window.location.origin;
   window.open(`${API_BASE}/api/export/...`, '_blank');
   ```

---

## 2. Deployment Architectures

Below are three standard ways to deploy this application:

### Method 1: Single-Service Deployment (FastAPI serves React)
*Best for: Render, Railway, Heroku, or direct Virtual Machines (VPS).*

In this setup, we build the React application into static files (`dist/`) and configure FastAPI to serve them directly. This eliminates CORS configuration issues and lets you manage only **one server**.

#### Steps:
1. **Build the React Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   This will output production-ready static assets in `frontend/dist/`.

2. **Configure FastAPI to Serve Static Files**:
   Modify `backend/app/main.py` to mount the static directories at the bottom of the file (after all API routes are defined):
   ```python
   from fastapi.staticfiles import StaticFiles
   from fastapi.responses import FileResponse
   import os

   # Mount frontend assets folder
   frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
   
   if os.path.exists(frontend_dist):
       # Serve JS/CSS/Assets
       app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
       
       # Catch-all to serve index.html for frontend routing (React Router)
       @app.get("/{catchall:path}")
       async def serve_frontend(catchall: str):
           # Skip api requests so we don't accidentally intercept failed api routes
           if catchall.startswith("api"):
               raise HTTPException(status_code=404, detail="API route not found")
           return FileResponse(os.path.join(frontend_dist, "index.html"))
   ```

3. **Deploy the Backend**:
   Deploy the `backend` folder to your cloud provider (e.g., Render Web Service).
   - **Build Command**: `pip install -r requirements.txt && python app/seed.py` (to seed database)
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

### Method 2: Containerized Deployment (Docker & Docker Compose)
*Best for: VPS (DigitalOcean, Linode, AWS EC2) or platforms supporting Docker.*

We can create container images for both frontend and backend, using **Nginx** to serve the static frontend and proxy backend API requests.

#### 1. Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run database seeding
RUN python app/seed.py

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 2. Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
# Step 1: Build React SPA
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom nginx configuration to handle React routing and proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 3. Nginx Configuration (`frontend/nginx.conf`)
```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to FastAPI container
    location /api {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

#### 4. Orchestration (`docker-compose.yml` in Workspace Root)
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/tickets.db:/app/tickets.db
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

To run this stack:
```bash
docker-compose up --build -d
```

---

### Method 3: Cloud Hosting PaaS (Render & Vercel)
If you prefer hosting the React app and FastAPI app separately on managed cloud solutions, the repository is configured to make this process seamless.

#### Backend (FastAPI) on Render:
We have included a `render.yaml` Blueprint specification file in the root of the workspace. This file defines a web service that:
- Deploys python runtime for the `backend/` directory.
- Mounts a 1 GB **Persistent Disk** at `/opt/data` so that SQLite data is preserved across restarts and redeployments.
- Seeds the database automatically on startup if it's empty.

##### Deployment Steps:
1. Push your code to GitHub.
2. Log in to the [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** and select **Blueprint**.
4. Connect your GitHub repository. Render will automatically read `render.yaml` and configure all settings.
5. In the configuration prompt, provide the value for:
   - `GEMINI_API_KEY`: (Optional) Your Google Gemini API key to activate advanced structured ticket classification. If not provided, it falls back to local rule-based mock classification.
6. Click **Apply**.
7. Render will provide a public URL like `https://ticket-triage-backend.onrender.com`.

*Note:* If you want to connect to a cloud PostgreSQL instance instead of the persistent SQLite file, simply add a `DATABASE_URL` environment variable to the Render service pointing to your PostgreSQL connection string (starting with `postgres://` or `postgresql://`). The system will automatically adapt.

#### Frontend (React) on Vercel:
We have included a `vercel.json` file inside the `frontend/` directory to handle React Router client-side routing rewrites automatically.

##### Deployment Steps:
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** and select **Project**.
3. Import your GitHub repository.
4. In the Project configuration:
   - Set **Root Directory** to `frontend`.
   - Ensure the **Build Command** is `npm run build` and **Output Directory** is `dist`.
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: The URL of your backend on Render (e.g. `https://ticket-triage-backend.onrender.com`).
6. Click **Deploy**.

---

## 3. Production Considerations
- **SQLite Database Persistence**: Render standard services are ephemeral. To solve this, the included `render.yaml` mounts a persistent block volume at `/opt/data/` and sets the default `DATABASE_URL` to `sqlite:////opt/data/tickets.db`.
- **PostgreSQL Databases**: You can switch from SQLite to PostgreSQL by provisioning a database on Render, Supabase, or RDS, and passing the `DATABASE_URL` environment variable to the backend Web Service. It will automatically install `psycopg2-binary` and configure the database schema.
- **Gemini API Key**: Keep your API keys secure. The API reads `GEMINI_API_KEY` directly from your server environment variables, bypassing any local config overrides.

