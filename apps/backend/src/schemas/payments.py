import datetime
from uuid import UUID

from pydantic import BaseModel


class PaymentCheckoutRead(BaseModel):
    """Response of checkout creation: the URL the client's browser redirects to."""

    payment_id: int
    checkout_url: str
    amount_cents: int


class PaymentRead(BaseModel):
    id: int
    service_order_id: int
    tenant_id: UUID
    amount_cents: int
    platform_fee_cents: int
    workshop_amount_cents: int
    status: str
    stripe_payment_intent_id: str | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class PaymentRefundRead(BaseModel):
    """Response of a refund: the resulting payment state."""

    payment_id: int
    status: str
