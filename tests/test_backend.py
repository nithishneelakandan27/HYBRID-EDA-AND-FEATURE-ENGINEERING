import sys
import os
from fastapi.testclient import TestClient

# Add backend directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "hybrid-eda-backend"
