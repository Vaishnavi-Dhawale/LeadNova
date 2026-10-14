import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.utils.security import get_password_hash, create_access_token


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def admin_token(db_session: Session):
    admin = db_session.query(User).filter(User.email == "admin@leadnova.com").first()
    return create_access_token(subject=admin.id)


@pytest.fixture(scope="session")
def sales_token(db_session: Session):
    sales = db_session.query(User).filter(User.email == "sales1@leadnova.com").first()
    return create_access_token(subject=sales.id)


@pytest.fixture(scope="session")
def manager_token(db_session: Session):
    manager = db_session.query(User).filter(User.email == "manager@leadnova.com").first()
    return create_access_token(subject=manager.id)
