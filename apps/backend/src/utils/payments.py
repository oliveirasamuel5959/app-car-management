"""Payment provider abstraction for the payments domain.

The service layer talks to the PaymentProvider protocol only — never to the
Stripe SDK directly — so tests and local development run on MockProvider
without network access or API keys.
"""

from typing import Protocol
from uuid import uuid4

from src.core.logger import get_logger

logger = get_logger(__name__)


class PaymentProvider(Protocol):
    """Provider contract: create an intent, verify it, refund it."""

    def create_intent(self, amount_cents: int, order_id: int) -> tuple[str, str]: ...

    def retrieve_intent(self, intent_id: str) -> str: ...

    def refund(self, intent_id: str) -> None: ...


class MockProvider:
    """Deterministic local provider — intents always confirm successfully."""

    def create_intent(self, amount_cents: int, order_id: int) -> tuple[str, str]:
        intent_id = f"mock_intent_{order_id}_{uuid4().hex[:8]}"
        logger.info(f"MockProvider: intent {intent_id} for order {order_id}")
        return intent_id, f"mock_secret_{intent_id}"

    def retrieve_intent(self, intent_id: str) -> str:
        return "succeeded" if (intent_id or "").startswith("mock_") else "failed"

    def refund(self, intent_id: str) -> None:
        logger.info(f"MockProvider: refunding intent {intent_id}")


class StripeProvider:
    """Stripe test-mode PaymentIntents on the platform account."""

    def __init__(self, api_key: str):
        import stripe

        self._stripe = stripe
        self._stripe.api_key = api_key

    def create_intent(self, amount_cents: int, order_id: int) -> tuple[str, str]:
        intent = self._stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="brl",
            metadata={"service_order_id": str(order_id)},
        )
        return intent.id, intent.client_secret

    def retrieve_intent(self, intent_id: str) -> str:
        return self._stripe.PaymentIntent.retrieve(intent_id).status

    def refund(self, intent_id: str) -> None:
        self._stripe.Refund.create(payment_intent=intent_id)


def get_payment_provider(app_settings) -> PaymentProvider:
    """Select the provider: mock when requested or when no secret key exists."""
    provider_name = getattr(app_settings, "PAYMENT_PROVIDER", "stripe")
    secret_key = getattr(app_settings, "STRIPE_SECRET_KEY", None)
    if provider_name == "mock" or not secret_key:
        return MockProvider()
    return StripeProvider(secret_key)
