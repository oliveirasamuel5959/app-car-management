import uuid
from datetime import datetime

import pytest
from sqlalchemy import UniqueConstraint, create_engine, event
from sqlalchemy.orm import sessionmaker

from src.db.base import Base
from src.models import Notification, Payment, Tenant, User, Vehicle, Workshop, WorkshopClient
from src.models.services import Service
from src.repositories.payments import (
    repo_create_payment,
    repo_get_payment_by_id,
    repo_get_payment_for_order,
)
from src.services.payments import PaymentService
from src.utils.payments import MockProvider


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


# ----------------------------------------------------------------------
# PaymentService (TG2)
# ----------------------------------------------------------------------


class FailingProvider:
    """Provider stub whose intents never confirm (simulates a failed card)."""

    def create_intent(self, amount_cents: int, order_id: int) -> tuple[str, str]:
        return "pi_failing", "mock_secret_pi_failing"

    def retrieve_intent(self, intent_id: str) -> str:
        return "requires_payment_method"

    def refund(self, intent_id: str) -> None:
        raise AssertionError("refund must not be called for failed intents")


def test_intent_requires_completed_order():
    session, tenant, service = seed_payment_graph()
    service.status = "pending"
    session.commit()

    with pytest.raises(ValueError):
        PaymentService(session, MockProvider()).create_payment_intent(
            service_order_id=service.id,
            user_id=2,
            user_email="client@test.dev",
        )


def test_intent_requires_final_cost():
    session, tenant, service = seed_payment_graph()
    service.final_cost = None
    session.commit()

    with pytest.raises(ValueError):
        PaymentService(session, MockProvider()).create_payment_intent(
            service_order_id=service.id,
            user_id=2,
            user_email="client@test.dev",
        )


def test_fee_math_ten_percent():
    session, tenant, service = seed_payment_graph()
    service.final_cost = 100.50
    session.commit()

    intent = PaymentService(session, MockProvider()).create_payment_intent(
        service_order_id=service.id,
        user_id=2,
        user_email="client@test.dev",
    )

    assert intent.amount_cents == 10050
    payment = repo_get_payment_for_order(session, tenant.id, service.id)
    assert payment is not None
    assert payment.amount_cents == 10050
    assert payment.platform_fee_cents == 1005
    assert payment.workshop_amount_cents == 9045
    assert payment.status == "pending"
    assert payment.stripe_payment_intent_id is not None


def test_intent_reuses_pending_payment_row():
    session, tenant, service = seed_payment_graph()
    service = PaymentService(session, MockProvider())

    first = service.create_payment_intent(
        service_order_id=1,
        user_id=2,
        user_email="client@test.dev",
    )
    second = service.create_payment_intent(
        service_order_id=1,
        user_id=2,
        user_email="client@test.dev",
    )

    assert first.payment_id == second.payment_id
    assert session.query(Payment).count() == 1


def test_intent_raises_when_order_already_paid():
    session, tenant, service = seed_payment_graph()
    payment_service = PaymentService(session, MockProvider())
    intent = payment_service.create_payment_intent(
        service_order_id=service.id,
        user_id=2,
        user_email="client@test.dev",
    )
    payment_service.confirm_payment(
        payment_id=intent.payment_id,
        user_id=2,
        user_email="client@test.dev",
    )

    # The order is no longer completed, so the order-status gate fires first.
    with pytest.raises(ValueError, match="concluídos"):
        payment_service.create_payment_intent(
            service_order_id=service.id,
            user_id=2,
            user_email="client@test.dev",
        )


def test_intent_blocks_when_succeeded_payment_row_exists():
    """Defensive branch: a completed order that already has a succeeded payment."""
    session, tenant, service = seed_payment_graph()
    repo_create_payment(
        session,
        tenant.id,
        service_order_id=service.id,
        amount_cents=10050,
        platform_fee_cents=1005,
        workshop_amount_cents=9045,
        stripe_payment_intent_id="pi_test_1",
    )
    session.query(Payment).update({"status": "succeeded"})
    session.commit()

    with pytest.raises(ValueError, match="já"):
        PaymentService(session, MockProvider()).create_payment_intent(
            service_order_id=service.id,
            user_id=2,
            user_email="client@test.dev",
        )


def test_confirm_pays_order_and_notifies_workshop():
    session, tenant, service = seed_payment_graph()
    payment_service = PaymentService(session, MockProvider())
    intent = payment_service.create_payment_intent(
        service_order_id=service.id,
        user_id=2,
        user_email="client@test.dev",
    )

    result = payment_service.confirm_payment(
        payment_id=intent.payment_id,
        user_id=2,
        user_email="client@test.dev",
    )

    assert result.status == "succeeded"
    session.refresh(service)
    assert service.status == "paid"
    notifications = (
        session.query(Notification).filter(Notification.service_id == service.id).all()
    )
    assert len(notifications) == 1
    assert {n.user_id for n in notifications} == {1}
    assert all(n.notification_type == "status_change" for n in notifications)


def test_confirm_is_idempotent():
    session, tenant, service = seed_payment_graph()
    payment_service = PaymentService(session, MockProvider())
    intent = payment_service.create_payment_intent(
        service_order_id=service.id,
        user_id=2,
        user_email="client@test.dev",
    )
    payment_service.confirm_payment(
        payment_id=intent.payment_id,
        user_id=2,
        user_email="client@test.dev",
    )

    again = payment_service.confirm_payment(
        payment_id=intent.payment_id,
        user_id=2,
        user_email="client@test.dev",
    )

    assert again.status == "succeeded"
    notifications = (
        session.query(Notification).filter(Notification.service_id == service.id).all()
    )
    assert len(notifications) == 1


def test_confirm_marks_failed_when_provider_not_succeeded():
    session, tenant, service = seed_payment_graph()
    payment_service = PaymentService(session, FailingProvider())
    intent = payment_service.create_payment_intent(
        service_order_id=service.id,
        user_id=2,
        user_email="client@test.dev",
    )

    with pytest.raises(ValueError):
        payment_service.confirm_payment(
            payment_id=intent.payment_id,
            user_id=2,
            user_email="client@test.dev",
        )

    payment = repo_get_payment_by_id(session, tenant.id, intent.payment_id)
    assert payment is not None
    assert payment.status == "failed"
    session.refresh(service)
    assert service.status == "completed"


def test_refund_requires_succeeded_payment():
    session, tenant, service = seed_payment_graph()
    payment_service = PaymentService(session, MockProvider())
    intent = payment_service.create_payment_intent(
        service_order_id=service.id,
        user_id=2,
        user_email="client@test.dev",
    )

    with pytest.raises(ValueError):
        payment_service.refund_payment(
            payment_id=intent.payment_id,
            user_id=1,
            tenant_id=tenant.id,
        )


def test_refund_workshop_flow_notifies_client():
    session, tenant, service = seed_payment_graph()
    payment_service = PaymentService(session, MockProvider())
    intent = payment_service.create_payment_intent(
        service_order_id=service.id,
        user_id=2,
        user_email="client@test.dev",
    )
    payment_service.confirm_payment(
        payment_id=intent.payment_id,
        user_id=2,
        user_email="client@test.dev",
    )

    refunded = payment_service.refund_payment(
        payment_id=intent.payment_id,
        user_id=1,
        tenant_id=tenant.id,
    )

    assert refunded.status == "refunded"
    session.refresh(service)
    assert service.status == "refunded"
    newest = (
        session.query(Notification)
        .filter(Notification.service_id == service.id)
        .order_by(Notification.id.desc())
        .first()
    )
    assert newest is not None and newest.user_id == 2


def test_cross_tenant_payment_denied():
    session, tenant, service = seed_payment_graph()
    payment_service = PaymentService(session, MockProvider())
    intent = payment_service.create_payment_intent(
        service_order_id=service.id,
        user_id=2,
        user_email="client@test.dev",
    )

    other_tenant = Tenant(id=uuid.uuid4(), slug="tenant-b", name="Tenant B")
    session.add(other_tenant)
    session.commit()

    assert (
        payment_service.create_payment_intent(
            service_order_id=service.id,
            user_id=3,
            user_email="other@test.dev",
        )
        is None
    )
    assert (
        payment_service.refund_payment(
            payment_id=intent.payment_id,
            user_id=3,
            tenant_id=other_tenant.id,
        )
        is None
    )


# ----------------------------------------------------------------------
# Provider selection (TG4)
# ----------------------------------------------------------------------


@pytest.mark.parametrize(
    ("provider_name", "secret_key", "expected_type"),
    [
        ("stripe", None, MockProvider),
        ("mock", "sk_test_secret", MockProvider),
        ("stripe", "sk_test_secret", "StripeProvider"),
    ],
)
def test_get_payment_provider_selection(provider_name, secret_key, expected_type):
    from types import SimpleNamespace

    from src.utils.payments import StripeProvider, get_payment_provider

    settings_stub = SimpleNamespace(
        PAYMENT_PROVIDER=provider_name, STRIPE_SECRET_KEY=secret_key
    )
    selected = get_payment_provider(settings_stub)
    if expected_type == "StripeProvider":
        assert isinstance(selected, StripeProvider)
    else:
        assert isinstance(selected, expected_type)
