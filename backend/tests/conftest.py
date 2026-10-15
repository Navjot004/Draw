import pytest
import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Ensure test DB is used
TEST_DB_URL = "sqlite:///./test_mystery_draw.db"
os.environ["DATABASE_URL"] = TEST_DB_URL

from app.database.session import Base, get_db
from app.main import app
from app.models.organizer import Organizer
from app.models.student_pool import StudentPoolSnapshot
from app.core.security import hash_password, create_access_token

test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if os.path.exists("./test_mystery_draw.db"):
        try:
            os.remove("./test_mystery_draw.db")
        except Exception:
            pass

@pytest.fixture
def db_session():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def test_organizer(db_session):
    organizer = Organizer(
        email="test_organizer@college.edu",
        password_hash=hash_password("SecurePassword123!"),
        role="organizer"
    )
    db_session.add(organizer)
    db_session.commit()
    db_session.refresh(organizer)
    return organizer

@pytest.fixture
def auth_headers(test_organizer):
    token = create_access_token({"sub": test_organizer.id, "email": test_organizer.email, "role": test_organizer.role})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def seeded_student_pool(db_session):
    students = [
        {"name": f"Student {i}", "reg_no": f"REG2024CS{i:04d}"}
        for i in range(1, 101)
    ]
    pool = StudentPoolSnapshot(
        source="test",
        total_fetched=100,
        eligible_count=100,
        invalid_count=0,
        duplicate_count=0,
        pool_hash="testhash123456789",
        is_active=True,
        is_confirmed=True,
        students_data=json.dumps(students),
        validation_summary=json.dumps({})
    )
    db_session.add(pool)
    db_session.commit()
    db_session.refresh(pool)
    return pool

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
