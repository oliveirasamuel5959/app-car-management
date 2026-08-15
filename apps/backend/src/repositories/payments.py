from uuid import UUID

from sqlalchemy.orm import Session

from src.core.logger import get_logger
from src.models.payment import Payment

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


def repo_update_payment_status(
    db: Session,
    payment: Payment,
    status: str,
    *,
    intent_id: str | None = None,
) -> Payment:
    """Apply a status change (and optionally the provider intent id) to a row."""
    payment.status = status
    if intent_id is not None:
        payment.stripe_payment_intent_id = intent_id
    db.commit()
    db.refresh(payment)
    return payment
