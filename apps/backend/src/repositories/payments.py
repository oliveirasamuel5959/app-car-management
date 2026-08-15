from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.core.logger import get_logger
from src.models.payment import Payment
from src.models.services import Service
from src.models.vehicle import Vehicle
from src.models.workshop_client import WorkshopClient

logger = get_logger(__name__)


def repo_create_payment(
    db: Session,
    tenant_id: UUID | str,
    *,
    service_order_id: int,
    amount_cents: int,
    platform_fee_cents: int,
    workshop_amount_cents: int,
    stripe_payment_intent_id: str | None = None,
) -> Payment:
    logger.info(f"Creating payment for order {service_order_id}")
    payment = Payment(
        tenant_id=tenant_id,
        service_order_id=service_order_id,
        amount_cents=amount_cents,
        platform_fee_cents=platform_fee_cents,
        workshop_amount_cents=workshop_amount_cents,
        status="pending",
        stripe_payment_intent_id=stripe_payment_intent_id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def repo_get_payment_for_order(
    db: Session, tenant_id: UUID | str, service_order_id: int
) -> Payment | None:
    """The payment row of a service order, always scoped to the tenant."""
    return (
        db.query(Payment)
        .filter(
            Payment.tenant_id == tenant_id,
            Payment.service_order_id == service_order_id,
        )
        .first()
    )


def repo_get_payment_by_id(
    db: Session, tenant_id: UUID | str, payment_id: int
) -> Payment | None:
    """A payment by id, always scoped to the tenant."""
    return (
        db.query(Payment)
        .filter(Payment.id == payment_id, Payment.tenant_id == tenant_id)
        .first()
    )


def repo_get_payment_for_client(
    db: Session,
    payment_id: int,
    user_id: int,
    user_email: str | None = None,
) -> Payment | None:
    """A payment reachable only through an order the client owns.

    Mirrors repo_get_service_by_user_id: ownership is relationship-backed via
    the order's vehicle or workshop client, so a payment can never be fetched
    for an order the user does not own.
    """
    ownership_filters = [
        Vehicle.user_id == user_id,
        WorkshopClient.user_id == user_id,
    ]
    if user_email is not None:
        ownership_filters.append(WorkshopClient.email == user_email)

    return (
        db.query(Payment)
        .join(Service, Payment.service_order_id == Service.id)
        .outerjoin(Vehicle, Service.vehicle_id == Vehicle.id)
        .outerjoin(WorkshopClient, Service.workshop_client_id == WorkshopClient.id)
        .filter(Payment.id == payment_id)
        .filter(or_(*ownership_filters))
        .distinct()
        .first()
    )


def repo_update_payment_status(
    db: Session,
    payment: Payment,
    status: str,
    *,
    reference_id: str | None = None,
) -> Payment:
    """Apply a status change (and optionally the provider session id) to a row."""
    payment.status = status
    if reference_id is not None:
        payment.stripe_payment_intent_id = reference_id
    db.commit()
    db.refresh(payment)
    return payment
