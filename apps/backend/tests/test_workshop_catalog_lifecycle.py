import uuid

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from src.db.base import Base
from src.models import Tenant, User, Workshop
from src.models.workshop_service import WorkshopService
from src.repositories.workshop_service import (repo_list_workshop_services,
                                               repo_replace_workshop_services)
from src.schemas.workshop_service import WorkshopServicesUpdate
from src.services.workshop_service import WorkshopServiceService

# ---------------------------------------------------------------------------
# Test infrastructure
# ---------------------------------------------------------------------------


def build_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def seed_catalog_graph():
    """Create two tenants, a workshop in tenant A, and a workshop user for it."""
    session = build_session()

    tenant_a = Tenant(id=uuid.uuid4(), slug="workshop-tenant-a", name="Workshop A")
    session.add(tenant_a)
    session.commit()

    tenant_b = Tenant(id=uuid.uuid4(), slug="workshop-tenant-b", name="Workshop B")
    session.add(tenant_b)
    session.commit()

    workshop_user = User(
        tenant_id=tenant_a.id,
        name="Workshop Owner",
        age=35,
        sex="M",
        email="workshop-a@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    session.add(workshop_user)
    session.commit()

    workshop = Workshop(
        tenant_id=tenant_a.id,
        user_id=workshop_user.id,
        name="Test Workshop",
        email="ws@test.dev",
        description="A test workshop",
        latitude=10.0,
        longitude=20.0,
        rating_avg=0.0,
    )
    session.add(workshop)
    session.commit()
    session.refresh(workshop)

    return session, tenant_a, tenant_b, workshop_user, workshop


# ---------------------------------------------------------------------------
# Case 1 — Replace with [manutencao, reparo] → exactly 2 rows persisted
# ---------------------------------------------------------------------------


def test_replace_services_creates_rows():
    session, tenant_a, tenant_b, w_user, workshop = seed_catalog_graph()

    service = WorkshopServiceService(session)
    rows = service.set_my_services(w_user.id, tenant_a.id, ["manutencao", "reparo"])

    types = sorted(r.service_type for r in rows)
    assert types == ["manutencao", "reparo"]
    assert all(r.workshop_id == workshop.id for r in rows)
    assert all(r.tenant_id == tenant_a.id for r in rows)

    # The list endpoint sees the same rows
    listed = service.get_my_services(w_user.id, tenant_a.id)
    assert sorted(r.service_type for r in listed) == ["manutencao", "reparo"]


# ---------------------------------------------------------------------------
# Case 2 — Replace again → old rows removed (bulk-replace semantics)
# ---------------------------------------------------------------------------


def test_replace_services_bulk_replaces_previous():
    session, tenant_a, tenant_b, w_user, workshop = seed_catalog_graph()

    service = WorkshopServiceService(session)
    service.set_my_services(w_user.id, tenant_a.id, ["manutencao", "reparo"])
    rows = service.set_my_services(w_user.id, tenant_a.id, ["inspecao"])

    assert [r.service_type for r in rows] == ["inspecao"]
    assert session.query(WorkshopService).count() == 1


# ---------------------------------------------------------------------------
# Case 3 — Duplicate values in the payload → single row per type
# ---------------------------------------------------------------------------


def test_replace_services_dedupes_duplicates():
    session, tenant_a, tenant_b, w_user, workshop = seed_catalog_graph()

    service = WorkshopServiceService(session)
    rows = service.set_my_services(
        w_user.id, tenant_a.id, ["manutencao", "manutencao", "reparo"]
    )

    assert sorted(r.service_type for r in rows) == ["manutencao", "reparo"]
    assert session.query(WorkshopService).count() == 2


# ---------------------------------------------------------------------------
# Case 4 — Catalog rows of tenant A are invisible to tenant B
# ---------------------------------------------------------------------------


def test_cross_tenant_catalog_invisible():
    session, tenant_a, tenant_b, w_user, workshop = seed_catalog_graph()

    service = WorkshopServiceService(session)
    service.set_my_services(w_user.id, tenant_a.id, ["manutencao"])

    assert repo_list_workshop_services(session, tenant_b.id, workshop.id) == []


# ---------------------------------------------------------------------------
# Case 5 — repo_* called without tenant id raises TypeError
# ---------------------------------------------------------------------------


def test_repo_without_tenant_raises():
    session, tenant_a, tenant_b, w_user, workshop = seed_catalog_graph()

    with pytest.raises(TypeError):
        repo_list_workshop_services(session, None, workshop.id)
    with pytest.raises(TypeError):
        repo_replace_workshop_services(session, None, workshop.id, ["manutencao"])


# ---------------------------------------------------------------------------
# Case 6 — Invalid service type → Pydantic ValidationError
# ---------------------------------------------------------------------------


def test_schema_rejects_invalid_service_type():
    with pytest.raises(ValidationError):
        WorkshopServicesUpdate(service_types=["limpeza"])

    assert WorkshopServicesUpdate(service_types=["outro"]).service_types == ["outro"]
    # Empty list is valid — it clears the catalog (bulk-replace semantics)
    assert WorkshopServicesUpdate(service_types=[]).service_types == []


def test_replace_services_with_empty_list_clears_catalog():
    session, tenant_a, tenant_b, w_user, workshop = seed_catalog_graph()

    service = WorkshopServiceService(session)
    service.set_my_services(w_user.id, tenant_a.id, ["manutencao", "reparo"])

    rows = service.set_my_services(w_user.id, tenant_a.id, [])

    assert rows == []
    assert session.query(WorkshopService).count() == 0


# ---------------------------------------------------------------------------
# Case 7 — Missing workshop for the user raises ValueError
# ---------------------------------------------------------------------------


def test_missing_workshop_raises_valueerror():
    session, tenant_a, tenant_b, w_user, workshop = seed_catalog_graph()

    stranger = User(
        tenant_id=tenant_b.id,
        name="No Workshop",
        age=30,
        sex="F",
        email="noworkshop@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    session.add(stranger)
    session.commit()

    service = WorkshopServiceService(session)
    with pytest.raises(ValueError):
        service.set_my_services(stranger.id, tenant_b.id, ["manutencao"])
    with pytest.raises(ValueError):
        service.get_my_services(stranger.id, tenant_b.id)
