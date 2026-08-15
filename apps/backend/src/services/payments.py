from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.logger import get_logger
from src.repositories.payments import (
    repo_create_payment,
    repo_get_payment_by_id,
    repo_get_payment_for_client,
    repo_get_payment_for_order,
    repo_update_payment_status,
)
from src.schemas.payments import PaymentIntentRead, PaymentRead, PaymentRefundRead
from src.services.services import (
    SERVICE_STATUS_COMPLETED,
    ServiceService,
)
from src.utils.payments import PaymentProvider, get_payment_provider

logger = get_logger(__name__)

PAYMENT_STATUS_PENDING = "pending"
PAYMENT_STATUS_SUCCEEDED = "succeeded"
PAYMENT_STATUS_REFUNDED = "refunded"
PAYMENT_STATUS_FAILED = "failed"

PLATFORM_FEE_RATE = 0.10


class PaymentService:
    """Business rules for paying completed service orders."""

    def __init__(self, db: Session, provider: PaymentProvider | None = None):
        self.db = db
        self.provider = (
            provider if provider is not None else get_payment_provider(settings)
        )

    def create_payment_intent(
        self,
        *,
        service_order_id: int,
        user_id: int,
        user_email: str | None = None,
    ) -> PaymentIntentRead | None:
        """Create (or reuse) the intent for a client-owned completed order."""
        service = ServiceService(self.db).get_service_order_for_client(
            service_order_id, user_id, user_email=user_email
        )
        if not service:
            return None
        if service.status != SERVICE_STATUS_COMPLETED:
            raise ValueError("Apenas serviços concluídos podem ser pagos")
        if service.final_cost is None or service.final_cost <= 0:
            raise ValueError("Este serviço não possui custo final para pagamento")

        existing = repo_get_payment_for_order(
            self.db, service.tenant_id, service_order_id
        )
        if existing and existing.status in {
            PAYMENT_STATUS_SUCCEEDED,
            PAYMENT_STATUS_REFUNDED,
        }:
            raise ValueError(
                "Pagamento deste serviço já foi concluído"
                if existing.status == PAYMENT_STATUS_SUCCEEDED
                else "Este serviço já foi reembolsado"
            )

        amount_cents = round(service.final_cost * 100)
        platform_fee_cents = round(amount_cents * PLATFORM_FEE_RATE)
        workshop_amount_cents = amount_cents - platform_fee_cents

        intent_id, client_secret = self.provider.create_intent(
            amount_cents, service_order_id
        )
        if existing:
            payment = repo_update_payment_status(
                self.db,
                existing,
                PAYMENT_STATUS_PENDING,
                intent_id=intent_id,
            )
        else:
            payment = repo_create_payment(
                self.db,
                service.tenant_id,
                service_order_id=service_order_id,
                amount_cents=amount_cents,
                platform_fee_cents=platform_fee_cents,
                workshop_amount_cents=workshop_amount_cents,
                stripe_payment_intent_id=intent_id,
            )
        logger.info(f"Payment intent {intent_id} ready for order {service_order_id}")
        return PaymentIntentRead(
            payment_id=payment.id,
            client_secret=client_secret,
            amount_cents=amount_cents,
        )

    def confirm_payment(
        self,
        *,
        payment_id: int,
        user_id: int,
        user_email: str | None = None,
    ) -> PaymentRead | None:
        """Verify the intent with the provider and pay the order. Idempotent."""
        payment = repo_get_payment_for_client(
            self.db, payment_id, user_id, user_email=user_email
        )
        if not payment:
            return None
        if payment.status == PAYMENT_STATUS_SUCCEEDED:
            return PaymentRead.model_validate(payment)

        service = ServiceService(self.db).get_service_order_for_client(
            payment.service_order_id, user_id, user_email=user_email
        )
        if not service:
            return None
        if payment.status != PAYMENT_STATUS_PENDING:
            raise ValueError("Este pagamento não pode mais ser confirmado")

        provider_status = self.provider.retrieve_intent(
            payment.stripe_payment_intent_id
        )
        if provider_status != "succeeded":
            repo_update_payment_status(self.db, payment, PAYMENT_STATUS_FAILED)
            raise ValueError("O pagamento não foi confirmado pela operadora")

        updated = repo_update_payment_status(self.db, payment, PAYMENT_STATUS_SUCCEEDED)
        ServiceService(self.db).pay_service_order(
            service_id=service.id,
            user_id=user_id,
            user_email=user_email,
        )
        return PaymentRead.model_validate(updated)

    def get_payment_for_order(
        self,
        *,
        service_order_id: int,
        user_id: int,
        tenant_id,
        role: str,
        user_email: str | None = None,
    ) -> PaymentRead | None:
        """Payment state for an order, visible to its client or workshop."""
        if role == "WORKSHOP":
            service = ServiceService(self.db).get_service_order_for_workshop(
                service_order_id, user_id, tenant_id
            )
        else:
            service = ServiceService(self.db).get_service_order_for_client(
                service_order_id, user_id, user_email=user_email
            )
        if not service:
            return None

        payment = repo_get_payment_for_order(
            self.db, service.tenant_id, service_order_id
        )
        return PaymentRead.model_validate(payment) if payment else None

    def refund_payment(
        self,
        *,
        payment_id: int,
        user_id: int,
        tenant_id,
    ) -> PaymentRefundRead | None:
        """Full refund of a succeeded payment, workshop-side."""
        payment = repo_get_payment_by_id(self.db, tenant_id, payment_id)
        if not payment:
            return None
        service = ServiceService(self.db).get_service_order_for_workshop(
            payment.service_order_id, user_id, tenant_id
        )
        if not service:
            return None
        if payment.status != PAYMENT_STATUS_SUCCEEDED:
            raise ValueError("Apenas pagamentos concluídos podem ser reembolsados")

        self.provider.refund(payment.stripe_payment_intent_id)
        updated = repo_update_payment_status(self.db, payment, PAYMENT_STATUS_REFUNDED)
        ServiceService(self.db).refund_service_order(
            service_id=service.id,
            user_id=user_id,
            tenant_id=tenant_id,
        )
        logger.info(f"Payment {payment.id} refunded")
        return PaymentRefundRead(payment_id=updated.id, status=updated.status)
