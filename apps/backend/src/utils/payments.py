"""Payment provider abstraction for the payments domain.

The service layer talks to the PaymentProvider protocol only — never to the
Stripe SDK directly — so tests and local development run on MockProvider
without network access or API keys. Both providers share one redirect-based
flow: create a checkout session (Stripe-hosted payment page), verify it via
retrieve, refund it.
"""

from typing import Protocol
from uuid import uuid4

from src.core.logger import get_logger

logger = get_logger(__name__)


class PaymentProvider(Protocol):
    """Provider contract: create a checkout session, verify it, refund it."""

    def create_checkout_session(
        self,
        amount_cents: int,
        order_id: int,
        success_url: str,
        cancel_url: str,
    ) -> tuple[str, str]: ...

    def retrieve_checkout_session(self, session_id: str) -> str: ...

    def refund(self, reference: str) -> None: ...


class MockProvider:
    """Deterministic local provider — sessions always verify as complete.

    The returned URL points at the app's own return page (the
    {CHECKOUT_SESSION_ID} template in `success_url` is filled with the
    synthetic session id), so the mock flow exercises the same redirect as
    the real Stripe flow.
    """

    def create_checkout_session(
        self,
        amount_cents: int,
        order_id: int,
        success_url: str,
        cancel_url: str,
    ) -> tuple[str, str]:
        session_id = f"mock_session_{order_id}_{uuid4().hex[:8]}"
        url = success_url.replace("{CHECKOUT_SESSION_ID}", session_id)
        logger.info(f"MockProvider: session {session_id} for order {order_id}")
        return session_id, url

    def retrieve_checkout_session(self, session_id: str) -> str:
        return "complete" if (session_id or "").startswith("mock_") else "open"

    def refund(self, reference: str) -> None:
        logger.info(f"MockProvider: refunding session {reference}")


class StripeProvider:
    """Stripe test-mode Checkout Sessions on the platform account."""

    def __init__(self, api_key: str):
        import stripe

        self._stripe = stripe
        self._stripe.api_key = api_key

    def create_checkout_session(
        self,
        amount_cents: int,
        order_id: int,
        success_url: str,
        cancel_url: str,
    ) -> tuple[str, str]:
        session = self._stripe.checkout.Session.create(
            mode="payment",
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": "brl",
                        "unit_amount": amount_cents,
                        "product_data": {"name": f"Serviço OS #{order_id}"},
                    },
                }
            ],
            metadata={"service_order_id": str(order_id)},
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return session.id, session.url

    def retrieve_checkout_session(self, session_id: str) -> str:
        return self._stripe.checkout.Session.retrieve(session_id).status

    def refund(self, reference: str) -> None:
        session = self._stripe.checkout.Session.retrieve(reference)
        self._stripe.Refund.create(payment_intent=session.payment_intent)


def get_payment_provider(app_settings) -> PaymentProvider:
    """Select the provider: mock when requested or when no secret key exists."""
    provider_name = getattr(app_settings, "PAYMENT_PROVIDER", "stripe")
    secret_key = getattr(app_settings, "STRIPE_SECRET_KEY", None)
    if provider_name == "mock" or not secret_key:
        return MockProvider()
    return StripeProvider(secret_key)
