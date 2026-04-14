import asyncio
from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pymongo import ReturnDocument

import main as backend_main
from app.core.security import get_password_hash
from app.db.mongodb import get_database
from app.utils.drive import normalize_and_validate_drive_url


class FakeCursor:
    def __init__(self, documents):
        self.documents = list(documents)

    def sort(self, field, direction):
        reverse = direction < 0
        self.documents.sort(key=lambda doc: doc.get(field), reverse=reverse)
        return self

    def skip(self, count):
        self.documents = self.documents[count:]
        return self

    def limit(self, count):
        self.documents = self.documents[:count]
        return self

    async def to_list(self, count):
        return deepcopy(self.documents[:count])


class FakeWriteResult:
    def __init__(self, modified_count=0, deleted_count=0):
        self.modified_count = modified_count
        self.deleted_count = deleted_count


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = [deepcopy(doc) for doc in (documents or [])]

    def _matches(self, document, query):
        for key, expected in query.items():
            value = document.get(key)
            if isinstance(expected, dict):
                for operator, operand in expected.items():
                    if operator == "$gte" and not (value is not None and value >= operand):
                        return False
                    if operator == "$ne" and value == operand:
                        return False
            elif value != expected:
                return False
        return True

    def _apply_projection(self, document, projection):
        if projection is None:
            return deepcopy(document)

        projected = deepcopy(document)
        excluded_keys = {key for key, value in projection.items() if value == 0}
        if excluded_keys:
            for key in excluded_keys:
                projected.pop(key, None)
            return projected

        included_keys = {key for key, value in projection.items() if value}
        return {key: deepcopy(document.get(key)) for key in included_keys if key in document}

    async def find_one(self, query, projection=None):
        for document in self.documents:
            if self._matches(document, query):
                return self._apply_projection(document, projection)
        return None

    def find(self, query=None, projection=None):
        query = query or {}
        documents = [
            self._apply_projection(document, projection)
            for document in self.documents
            if self._matches(document, query)
        ]
        return FakeCursor(documents)

    async def insert_one(self, document):
        self.documents.append(deepcopy(document))
        return FakeWriteResult(modified_count=1)

    async def count_documents(self, query):
        return sum(1 for document in self.documents if self._matches(document, query))

    async def update_one(self, query, update):
        for document in self.documents:
            if self._matches(document, query):
                if "$set" in update:
                    document.update(deepcopy(update["$set"]))
                if "$inc" in update:
                    for key, value in update["$inc"].items():
                        document[key] = document.get(key, 0) + value
                return FakeWriteResult(modified_count=1)
        return FakeWriteResult(modified_count=0)

    async def find_one_and_update(self, query, update, return_document=None, projection=None):
        for document in self.documents:
            if self._matches(document, query):
                if "$set" in update:
                    document.update(deepcopy(update["$set"]))
                target = document if return_document == ReturnDocument.AFTER else deepcopy(document)
                return self._apply_projection(target, projection)
        return None

    async def delete_one(self, query):
        for index, document in enumerate(self.documents):
            if self._matches(document, query):
                self.documents.pop(index)
                return FakeWriteResult(deleted_count=1)
        return FakeWriteResult(deleted_count=0)

    async def delete_many(self, query):
        original_count = len(self.documents)
        self.documents = [document for document in self.documents if not self._matches(document, query)]
        return FakeWriteResult(deleted_count=original_count - len(self.documents))


class FakeDatabase:
    def __init__(self):
        now = datetime.now(timezone.utc)
        self.admins = FakeCollection(
            [
                {
                    "id": "admin_001",
                    "email": "admin@example.com",
                    "name": "Primary Admin",
                    "hashed_password": get_password_hash("Password123"),
                    "is_active": True,
                    "created_at": now,
                    "last_login_at": None,
                },
                {
                    "id": "admin_002",
                    "email": "inactive@example.com",
                    "name": "Inactive Admin",
                    "hashed_password": get_password_hash("Password123"),
                    "is_active": False,
                    "created_at": now,
                    "last_login_at": None,
                },
            ]
        )
        self.admin_login_attempts = FakeCollection()
        self.papers = FakeCollection(
            [
                {
                    "id": "paper-1",
                    "title": "Networks 2023",
                    "subject": "Networks",
                    "department": "CSE",
                    "year": 2023,
                    "pdfUrl": "https://example.com/paper-1.pdf",
                    "type": "Sem",
                }
            ]
        )
        self.faculty_profiles = FakeCollection(
            [
                {"id": "fac-1", "email": "faculty1@example.com"},
                {"id": "fac-2", "email": "faculty2@example.com"},
            ]
        )
        self.appointments = FakeCollection(
            [
                {"id": "appt-1", "otp_verified": True, "appointment_status": "pending"},
                {"id": "appt-2", "otp_verified": True, "appointment_status": "accepted"},
                {"id": "appt-3", "otp_verified": False, "appointment_status": "pending"},
            ]
        )


@pytest.fixture
def fake_db():
    return FakeDatabase()


@pytest.fixture
def client(fake_db, monkeypatch):
    async def no_op():
        return None

    async def fake_normalize(url):
        return url

    monkeypatch.setattr(backend_main, "connect_to_mongo", no_op)
    monkeypatch.setattr(backend_main, "close_mongo_connection", no_op)
    backend_main.app.dependency_overrides[get_database] = lambda: fake_db

    from app.routes import papers

    monkeypatch.setattr(papers, "normalize_and_validate_drive_url", fake_normalize)

    with TestClient(backend_main.app) as test_client:
        yield test_client

    backend_main.app.dependency_overrides.clear()


def login_as_admin(client, email="admin@example.com", password="Password123"):
    return client.post(
        "/api/auth/admin/login",
        json={"email": email, "password": password},
    )


def test_faculty_login_rejects_non_college_email(client):
    response = client.post(
        "/api/auth/faculty/login",
        json={"email": "faculty@gmail.com"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Use your college email ending with @klu.ac.in."


def test_faculty_password_login_rejects_non_college_email(client):
    response = client.post(
        "/api/auth/faculty/password-login",
        json={"email": "faculty@gmail.com", "password": "Password123"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Use your college email ending with @klu.ac.in."


def test_drive_url_validation_rejects_non_drive_link():
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(normalize_and_validate_drive_url("https://example.com/dbms.pdf"))

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "PDF link must be a Google Drive URL."


def test_admin_login_sets_cookie_and_returns_admin(client):
    response = login_as_admin(client)

    assert response.status_code == 200
    assert response.json()["admin"]["email"] == "admin@example.com"
    assert "admin_session" in response.cookies


def test_admin_login_rejects_inactive_admin(client):
    response = login_as_admin(client, email="inactive@example.com")

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."


def test_admin_login_rate_limit_returns_429(client, fake_db):
    now = datetime.now(timezone.utc)
    fake_db.admin_login_attempts = FakeCollection(
        [
            {
                "email": "admin@example.com",
                "ip_address": "testclient",
                "created_at": now - timedelta(minutes=1),
            }
            for _ in range(5)
        ]
    )

    response = login_as_admin(client, password="WrongPassword")

    assert response.status_code == 429
    assert response.json()["detail"] == "Too many login attempts. Please try again later."


def test_admin_me_requires_valid_session_cookie(client):
    unauthorized_response = client.get("/api/auth/admin/me")
    assert unauthorized_response.status_code == 401

    login_response = login_as_admin(client)
    assert login_response.status_code == 200

    authorized_response = client.get("/api/auth/admin/me")
    assert authorized_response.status_code == 200
    assert authorized_response.json()["id"] == "admin_001"


def test_admin_logout_clears_session_cookie(client):
    login_response = login_as_admin(client)
    assert login_response.status_code == 200

    logout_response = client.post("/api/auth/admin/logout")

    assert logout_response.status_code == 200
    assert logout_response.json()["message"] == "Logged out successfully"
    assert client.get("/api/auth/admin/me").status_code == 401


def test_paper_mutations_require_admin_auth(client):
    create_response = client.post(
        "/api/papers",
        json={
            "title": "DBMS 2024",
            "subject": "DBMS",
            "department": "CSE",
            "year": 2024,
            "pdfUrl": "https://example.com/dbms.pdf",
            "type": "Sem",
        },
    )
    update_response = client.put("/api/papers/paper-1", json={"title": "Updated"})
    delete_response = client.delete("/api/papers/paper-1")

    assert create_response.status_code == 401
    assert update_response.status_code == 401
    assert delete_response.status_code == 401


def test_paper_mutations_succeed_for_authenticated_admin(client):
    assert login_as_admin(client).status_code == 200

    create_response = client.post(
        "/api/papers",
        json={
            "title": "DBMS 2024",
            "subject": "DBMS",
            "department": "CSE",
            "year": 2024,
            "pdfUrl": "https://example.com/dbms.pdf",
            "type": "Sem",
        },
    )
    update_response = client.put("/api/papers/paper-1", json={"title": "Updated Networks"})
    delete_response = client.delete("/api/papers/paper-1")

    assert create_response.status_code == 200
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Updated Networks"
    assert delete_response.status_code == 200


def test_admin_stats_require_auth_and_return_expected_shape(client):
    unauthorized_response = client.get("/api/admin/stats")
    assert unauthorized_response.status_code == 401

    assert login_as_admin(client).status_code == 200
    authorized_response = client.get("/api/admin/stats")

    assert authorized_response.status_code == 200
    assert authorized_response.json() == {
        "papers_count": 1,
        "faculty_count": 2,
        "appointments_count": 2,
        "pending_appointments_count": 1,
    }
