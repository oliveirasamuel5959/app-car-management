import uuid
from datetime import datetime

from sqlalchemy import UniqueConstraint, create_engine, event
from sqlalchemy.orm import sessionmaker

from src.db.base import Base
from src.models import Tenant, User, Vehicle, Workshop, WorkshopClient
from src.models.services import Service
from src.repositories.payments import (
    repo_create_payment,
    repo_get_payment_by_id,
    repo_get_payment_for_order,
)


def build_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def seed_payment_graph():
    """Tenant + users + workshop + a completed service order with a final cost."""
    session = build_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant)
    session.commit()

    workshop_user = User(
        id=1,
        tenant_id=tenant.id,
        name="Workshop Owner",
        age=32,
        sex="M",
        email="workshop@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    client_user = User(
        id=2,
        tenant_id=tenant.id,
        name="Client User",
        age=28,
        sex="F",
        email="client@test.dev",
        password_hash="hashed",
        role="CLIENT",
        is_active=True,
    )
    session.add_all([workshop_user, client_user])
    session.commit()

    workshop = Workshop(
        id=1,
        tenant_id=tenant.id,
        user_id=workshop_user.id,
        name="Tenant Workshop",
        email="tenant-workshop@test.dev",
        description="desc",
        latitude=10,
        longitude=20,
        rating_avg=4.2,
    )
    vehicle = Vehicle(
        id=1,
        tenant_id=tenant.id,
        brand="Honda",
        model="Civic",
        year=2020,
        plate="AAA-0001",
        user_id=client_user.id,
    )
    workshop_client = WorkshopClient(
        id=1,
        tenant_id=tenant.id,
        workshop_id=workshop.id,
        name="Client User",
        email=client_user.email,
        phone="5551999999999",
        vehicle_brand="Honda",
        vehicle_model="Civic",
        vehicle_year=2020,
        vehicle_plate="AAA-0001",
        user_id=client_user.id,
    )
    session.add_all([workshop, vehicle, workshop_client])
    session.commit()

    service = Service(
        id=1,
        tenant_id=tenant.id,
        workshop_id=workshop.id,
        vehicle_id=vehicle.id,
        workshop_client_id=workshop_client.id,
        name="Troca de óleo",
        status="completed",
        checkin_date=datetime(2026, 8, 10, 9, 0),
        estimated_cost=100.50,
        final_cost=100.50,
    )
    session.add(service)
    session.commit()
    return session, tenant, service


# ----------------------------------------------------------------------
# Structural (TG1)
# ----------------------------------------------------------------------


def test_payment_model_registered_and_shaped():
    assert "payments" in Base.metadata.tables
    table = Base.metadata.tables["payments"]
    for col in [
        "tenant_id",
        "service_order_id",
        "amount_cents",
        "platform_fee_cents",
        "workshop_amount_cents",
        "status",
        "stripe_payment_intent_id",
        "created_at",
        "updated_at",
    ]:
        assert col in table.columns, f"missing column {col}"

    uniques = {
        tuple(c.name for c in constraint.columns)
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert ("service_order_id",) in uniques


def test_workshop_rating_gains_service_order_id():
    table = Base.metadata.tables["workshop_ratings"]
    assert "service_order_id" in table.columns

    uniques = {
        tuple(c.name for c in constraint.columns)
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert ("service_order_id",) in uniques


# ----------------------------------------------------------------------
# Repository (TG1)
# ----------------------------------------------------------------------


def test_repo_create_payment_persists_and_is_tenant_scoped():
    session, tenant, service = seed_payment_graph()
    payment = repo_create_payment(
        session,
        tenant.id,
        service_order_id=service.id,
        amount_cents=10050,
        platform_fee_cents=1005,
        workshop_amount_cents=9045,
        stripe_payment_intent_id="pi_test_1",
    )

    assert payment.id is not None
    assert payment.status == "pending"
    assert payment.tenant_id == tenant.id

    fetched = repo_get_payment_for_order(session, tenant.id, service.id)
    assert fetched is not None and fetched.id == payment.id

    assert repo_get_payment_for_order(session, uuid.uuid4(), service.id) is None
    assert repo_get_payment_by_id(session, tenant.id, payment.id) is not None
    assert repo_get_payment_by_id(session, uuid.uuid4(), payment.id) is None
