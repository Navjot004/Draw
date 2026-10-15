import uuid
import pytest

def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_login_success(client, test_organizer):
    res = client.post("/api/auth/login", json={
        "email": test_organizer.email,
        "password": "SecurePassword123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["organizer"]["email"] == test_organizer.email
    assert "mystery_auth_token" in res.cookies

def test_login_invalid_password(client, test_organizer):
    res = client.post("/api/auth/login", json={
        "email": test_organizer.email,
        "password": "WrongPassword!"
    })
    assert res.status_code == 401

def test_protected_routes_require_auth(client):
    # Unauthenticated requests should be 401
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/students/status").status_code == 401
    assert client.post("/api/students/sync").status_code == 401
    assert client.post("/api/draws", json={"idempotency_key": "123"}).status_code == 401
    assert client.get("/api/draws/history").status_code == 401

def test_auth_me(client, auth_headers, test_organizer):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == test_organizer.email

def test_students_sync_and_status(client, auth_headers):
    # Sync students
    sync_res = client.post("/api/students/sync", headers=auth_headers)
    assert sync_res.status_code == 200
    summary = sync_res.json()
    assert summary["total_fetched"] >= 6000
    assert summary["eligible_count"] >= 5900
    assert len(summary["pool_hash"]) == 64

    # Check status
    status_res = client.get("/api/students/status", headers=auth_headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["is_ready"] is True
    assert status_data["total_eligible"] == summary["eligible_count"]

def test_create_and_retrieve_draw(client, auth_headers, seeded_student_pool):
    key = str(uuid.uuid4())
    # 1. Create draw
    create_res = client.post(
        "/api/draws",
        headers=auth_headers,
        json={"idempotency_key": key}
    )
    assert create_res.status_code == 201
    draw_data = create_res.json()
    draw_id = draw_data["id"]
    assert draw_data["winner_name"] is not None
    assert draw_data["winner_reg_no"] is not None
    assert draw_data["participant_count"] == 100

    # 2. Retrieve draw by ID (for recovery or replay)
    get_res = client.get(f"/api/draws/{draw_id}", headers=auth_headers)
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["id"] == draw_id
    assert retrieved["winner_name"] == draw_data["winner_name"]

    # 3. Retrieve draw history
    history_res = client.get("/api/draws/history", headers=auth_headers)
    assert history_res.status_code == 200
    history = history_res.json()
    assert history["total"] >= 1
    assert any(item["id"] == draw_id for item in history["items"])
