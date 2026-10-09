"""Client-side workshop detail access (`GET /api/v1/workshops/{id}`).

Clients browse the public directory and pick a workshop they have never used
before. That lookup must succeed without a pre-existing service relationship,
while workshop owners keep their tenant-scoped view.
"""

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.core.security import create_access_token
from src.db.base import Base
from src.db.database import get_session
from src.main import app
from src.models import Tenant, User, Workshop
from src.services.workshop import WorkshopService


def build_app_session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def make_token(user_id: int, role: str, tenant_id, email: str) -> str:
    return create_access_token(
        {
            "sub": email,
            "user_id": user_id,
            "role": role,
            "tenant_id": str(tenant_id),
            "tenant_slug": "slug",
        }
    )


def seed_two_tenants():
    """Tenant A owns workshop 1; tenant B is an unrelated client."""
    session = build_app_session()

    tenant_a = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    tenant_b = Tenant(id=uuid.uuid4(), slug="tenant-b", name="Tenant B")
    session.add_all([tenant_a, tenant_b])
    session.commit()

    owner = User(
        id=1,
        tenant_id=tenant_a.id,
        name="Owner",
        age=40,
        sex="M",
        email="owner@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    client = User(
        id=2,
        tenant_id=tenant_b.id,
        name="Client",
        age=30,
        sex="F",
        email="client@test.dev",
        password_hash="hashed",
        role="CLIENT",
        is_active=True,
    )
    session.add_all([owner, client])
    session.commit()

    workshop = Workshop(
        id=1,
        tenant_id=tenant_a.id,
        name="Oficina do Zé",
        latitude=-23.5,
        longitude=-46.6,
        user_id=owner.id,
    )
    session.add(workshop)
    session.commit()

    return session, tenant_a, tenant_b


def test_client_sees_workshop_without_prior_service_relationship():
    """The regression: discovery listed a workshop that detail then 404'd."""
    session, _, tenant_b = seed_two_tenants()
    app.dependency_overrides[get_session] = lambda: session
    try:
        from fastapi.testclient import TestClient

        with TestClient(app) as client:
            response = client.get(
                "/api/v1/workshops/1",
                headers={
                    "Authorization": (
                        "Bearer "
                        + make_token(2, "CLIENT", tenant_b.id, "client@test.dev")
                    )
                },
            )

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == 1
        assert body["name"] == "Oficina do Zé"
        # Clients need this as the chat recipient.
        assert body["user_id"] == 1
    finally:
        app.dependency_overrides.pop(get_session, None)


def test_client_response_omits_owning_tenant_identifiers():
    session, _, tenant_b = seed_two_tenants()
    app.dependency_overrides[get_session] = lambda: session
    try:
        from fastapi.testclient import TestClient

        with TestClient(app) as client:
            response = client.get(
                "/api/v1/workshops/1",
                headers={
                    "Authorization": (
                        "Bearer "
                        + make_token(2, "CLIENT", tenant_b.id, "client@test.dev")
                    )
                },
            )

        assert response.status_code == 200
        body = response.json()
        assert "tenant_id" not in body
        assert "email" not in body
    finally:
        app.dependency_overrides.pop(get_session, None)


def test_missing_workshop_still_404s_for_clients():
    session, _, tenant_b = seed_two_tenants()
    app.dependency_overrides[get_session] = lambda: session
    try:
        from fastapi.testclient import TestClient

        with TestClient(app) as client:
            response = client.get(
                "/api/v1/workshops/999",
                headers={
                    "Authorization": (
                        "Bearer "
                        + make_token(2, "CLIENT", tenant_b.id, "client@test.dev")
                    )
                },
            )

        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_session, None)


def test_workshop_owner_still_gets_tenant_scoped_record():
    """The owner path must keep its tenant scoping after the client change.

    Exercised at the service layer: the route hands the repo the JWT's
    `tenant_id` as a string, which Postgres casts to UUID but the SQLite test
    dialect rejects.
    """
    session, tenant_a, _ = seed_two_tenants()
    try:
        workshop = WorkshopService(session).get_workshop_by_id(1, tenant_a.id)
        assert workshop.id == 1
        assert workshop.name == "Oficina do Zé"
    finally:
        session.close()


def test_workshop_owner_cannot_read_another_tenants_workshop():
    session, _, tenant_b = seed_two_tenants()
    try:
        with pytest.raises(ValueError):
            WorkshopService(session).get_workshop_by_id(1, tenant_b.id)
    finally:
        session.close()
