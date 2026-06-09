import unittest
import os
import sys
from fastapi.testclient import TestClient

# Add parent directory to path to find app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import SessionLocal
from app.models import Ticket

client = TestClient(app)

class TestTicketTriageAPI(unittest.TestCase):
    
    def setUp(self):
        # Ensure we have at least some data in database to prevent dividing by zero
        self.db = SessionLocal()
        ticket_count = self.db.query(Ticket).count()
        if ticket_count == 0:
            # Seed a single ticket for test purposes
            test_ticket = Ticket(
                ticket_id="TC-TEST",
                title="Test Ticket Title",
                description="This is a test description for unit verification.",
                category="Bug",
                priority="P3 Medium",
                reasoning="Test reasoning.",
                confidence=0.99,
                processing_time=0.5,
                user_type="demo"
            )
            self.db.add(test_ticket)
            self.db.commit()
            
    def tearDown(self):
        self.db.close()

    def test_get_stats(self):
        """Test the /api/stats endpoint return structures with demo scope"""
        response = client.get("/api/stats", headers={"X-User-Type": "demo"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_tickets", data)
        self.assertIn("critical_tickets_count", data)
        self.assertIn("average_confidence", data)
        self.assertGreater(data["total_tickets"], 0)

    def test_get_results(self):
        """Test the /api/results list query endpoint with demo scope"""
        response = client.get("/api/results?page=1&limit=5", headers={"X-User-Type": "demo"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("tickets", data)
        self.assertIn("total", data)
        self.assertEqual(len(data["tickets"]), 5 if data["total"] >= 5 else data["total"])

    def test_get_ticket_details(self):
        """Test fetching a specific ticket detail by ID with demo scope"""
        # Fetch first ticket from database
        ticket = self.db.query(Ticket).filter(Ticket.user_type == "demo").first()
        self.assertIsNotNone(ticket)
        
        response = client.get(f"/api/ticket/{ticket.id}", headers={"X-User-Type": "demo"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["ticket_id"], ticket.ticket_id)
        self.assertEqual(data["title"], ticket.title)

    def test_settings_endpoints(self):
        """Test reading and writing settings (unprotected)"""
        # Test GET settings
        get_res = client.get("/api/settings")
        self.assertEqual(get_res.status_code, 200)
        orig_settings = get_res.json()
        self.assertIn("model_name", orig_settings)

        # Test POST update settings
        update_payload = {
            "model_name": "gemini-1.5-pro",
            "system_prompt": "You are a helpful test agent prompt."
        }
        post_res = client.post("/api/settings", json=update_payload)
        self.assertEqual(post_res.status_code, 200)
        self.assertEqual(post_res.json()["status"], "success")

        # Verify change is persisted
        check_res = client.get("/api/settings")
        self.assertEqual(check_res.json()["model_name"], "gemini-1.5-pro")

    def test_chat_assistant(self):
        """Test assistant chatbot queries with demo scope"""
        payload = {
            "message": "How many bug tickets do we have?"
        }
        response = client.post("/api/chat", json=payload, headers={"X-User-Type": "demo"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("reply", data)
        self.assertIn("suggested_actions", data)
        self.assertIn("bug", data["reply"].lower())

    def test_signup_and_login_flow(self):
        """Test user signup, hashing, and login token generation"""
        # Unique email for test
        email = f"testuser_{os.urandom(4).hex()}@example.com"
        password = "securepassword123"
        
        # 1. Test Signup
        signup_res = client.post("/api/auth/signup", json={"email": email, "password": password})
        self.assertEqual(signup_res.status_code, 200)
        self.assertEqual(signup_res.json()["status"], "success")
        
        # 2. Test Login
        login_res = client.post("/api/auth/login", json={"email": email, "password": password})
        self.assertEqual(login_res.status_code, 200)
        self.assertEqual(login_res.json()["status"], "success")
        self.assertIn("token", login_res.json())
        
        # 3. Test Authorized access with JWT
        token = login_res.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        stats_res = client.get("/api/stats", headers=headers)
        self.assertEqual(stats_res.status_code, 200)
        self.assertEqual(stats_res.json()["total_tickets"], 0) # new user should have 0 tickets initially

    def test_unauthorized_endpoints(self):
        """Test that missing credentials result in 401 Unauthorized errors"""
        stats_res = client.get("/api/stats")
        self.assertEqual(stats_res.status_code, 401)
        
        results_res = client.get("/api/results")
        self.assertEqual(results_res.status_code, 401)

if __name__ == "__main__":
    unittest.main()
