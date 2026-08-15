import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from src.core.logger import get_logger
from src.models.services_history import ServiceHistory, ServiceType
from src.repositories.services_history import (
    repo_create_service_history,
    repo_delete_service_history,
    repo_get_service_history_by_id,
    repo_get_services_history_for_user,
    repo_get_services_history_for_workshop,
    repo_update_service_history,
)
from src.repositories.workshop import repo_get_workshop_for_user
from src.schemas.services_history import (
    ServiceHistoryCreate,
    ServiceHistoryRead,
    ServiceHistoryUpdate,
)
from src.utils.services_history import (
    calculate_next_service_date,
    calculate_next_service_mileage,
)

logger = get_logger(__name__)

SERVICE_HISTORY_STATUS_COMPLETED = "completed"


class ServiceHistoryReadOnlyError(Exception):
    """Raised when a client attempts to modify a workshop-authored service-history record."""


class ServiceHistoryService:
    def __init__(self, db: Session):
        self.db = db

    def create_service_history(
        self, history_in: ServiceHistoryCreate, user_id: int, tenant_id: uuid.UUID
    ) -> ServiceHistoryRead:
        # Create service history record
        logger.info(
            f"Creating service history record for user_id={user_id}, tenant_id={tenant_id}"
        )

        if history_in.current_mileage is None:
            raise ValueError(
                "Current mileage is required to calculate next service mileage"
            )

        if history_in.serviced_at is None:
            raise ValueError("Service date is required to calculate next service date")

        next_service_mileage = calculate_next_service_mileage(
            history_in.current_mileage, history_in.service_type
        )
        next_service_date = calculate_next_service_date(
            history_in.serviced_at, history_in.service_type
        )

        history_data = {
            **history_in.dict(),
            "next_service_mileage": next_service_mileage,
            "next_service_date": next_service_date,
            # Manual client entries are never attributed to a workshop and always
            # represent already-performed maintenance.
            "workshop_id": None,
            "status": SERVICE_HISTORY_STATUS_COMPLETED,
        }

        history_record = repo_create_service_history(self.db, tenant_id, history_data)

        return history_record

    def create_service_history_from_completion(
        self,
        *,
        tenant_id: uuid.UUID,
        workshop_id: int,
        vehicle_id: int | None,
        workshop_client_id: int | None = None,
        service_order_id: int | None = None,
        service_type: str | None,
        current_mileage: int | None,
        serviced_at: datetime,
        description: str | None = None,
        labor_cost: float | None = None,
        labor_description: str | None = None,
        parts_cost: float | None = None,
        invoice_number: str | None = None,
        warranty_until_date: datetime | None = None,
        warranty_mileage: int | None = None,
    ) -> ServiceHistory | None:
        """Auto-create a service-history record when a workshop completes a service order.

        Skips (returns None) only when the order has no linked vehicle. Every
        completed order with a vehicle appears in the maintenance history;
        service_type defaults to "other" and mileage stays optional.
        """
        if vehicle_id is None:
            logger.info(
                "Skipping service-history auto-create: completed order has no vehicle_id"
            )
            return None

        resolved_service_type = service_type or ServiceType.OTHER.value
        next_service_mileage = (
            calculate_next_service_mileage(current_mileage, resolved_service_type)
            if current_mileage is not None
            else None
        )
        next_service_date = calculate_next_service_date(
            serviced_at, resolved_service_type
        )

        history_data = {
            "vehicle_id": vehicle_id,
            "workshop_client_id": workshop_client_id,
            "service_order_id": service_order_id,
            "service_type": resolved_service_type,
            "description": description,
            "current_mileage": current_mileage,
            "next_service_mileage": next_service_mileage,
            "labor_cost": labor_cost,
            "labor_description": labor_description,
            "parts_cost": parts_cost,
            "invoice_number": invoice_number,
            "warranty_until_date": warranty_until_date,
            "warranty_mileage": warranty_mileage,
            "serviced_at": serviced_at,
            "next_service_date": next_service_date,
            "workshop_id": workshop_id,
            "status": SERVICE_HISTORY_STATUS_COMPLETED,
        }

        return repo_create_service_history(self.db, tenant_id, history_data)

    def get_services_history_for_workshop(
        self,
        tenant_id: uuid.UUID,
        user_id: int,
        service_type: str | None = None,
        vehicle_id: int | None = None,
        workshop_client_id: int | None = None,
    ) -> list[ServiceHistory]:
        """List service-history records authored by the authenticated workshop."""
        workshop = repo_get_workshop_for_user(self.db, user_id, tenant_id)
        if not workshop:
            return []
        return repo_get_services_history_for_workshop(
            self.db,
            tenant_id=tenant_id,
            workshop_id=workshop.id,
            service_type=service_type,
            vehicle_id=vehicle_id,
            workshop_client_id=workshop_client_id,
        )

    def get_services_history(
        self,
        tenant_id: uuid.UUID,
        user_id: int,
        service_type: str | None = None,
        vehicle_id: int | None = None,
    ) -> list[ServiceHistory]:
        """List the authenticated client's service-history records, optionally filtered."""
        return repo_get_services_history_for_user(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            service_type=service_type,
            vehicle_id=vehicle_id,
        )

    def get_service_history_by_id(
        self,
        history_id: int,
        tenant_id: uuid.UUID,
        user_id: int,
    ) -> ServiceHistory | None:
        """Get a single service-history record owned by the client."""
        return repo_get_service_history_by_id(self.db, history_id, tenant_id, user_id)

    def update_service_history(
        self,
        history_id: int,
        history_in: ServiceHistoryUpdate,
        tenant_id: uuid.UUID,
        user_id: int,
    ) -> ServiceHistory | None:
        """Update a service-history record, re-deriving next-service predictions when needed."""
        history = repo_get_service_history_by_id(
            self.db, history_id, tenant_id, user_id
        )
        if not history:
            return None

        if history.workshop_id is not None:
            raise ServiceHistoryReadOnlyError(
                "This record was created by a workshop and cannot be modified by the client."
            )

        update_data = history_in.model_dump(exclude_unset=True)

        # Normalize enum values to their string form for persistence and calculation.
        if "service_type" in update_data:
            update_data["service_type"] = getattr(
                update_data["service_type"], "value", update_data["service_type"]
            )

        # Re-derive predictions when the inputs that drive them change.
        effective_service_type = update_data.get("service_type", history.service_type)

        if "current_mileage" in update_data or "service_type" in update_data:
            current_mileage = update_data.get(
                "current_mileage", history.current_mileage
            )
            if (
                current_mileage is not None
                and "next_service_mileage" not in update_data
            ):
                update_data["next_service_mileage"] = calculate_next_service_mileage(
                    current_mileage, effective_service_type
                )

        if "serviced_at" in update_data or "service_type" in update_data:
            serviced_at = update_data.get("serviced_at", history.serviced_at)
            if serviced_at is not None and "next_service_date" not in update_data:
                update_data["next_service_date"] = calculate_next_service_date(
                    serviced_at, effective_service_type
                )

        return repo_update_service_history(self.db, history, update_data)

    def delete_service_history(
        self,
        history_id: int,
        tenant_id: uuid.UUID,
        user_id: int,
    ) -> bool:
        """Delete a service-history record owned by the client."""
        history = repo_get_service_history_by_id(
            self.db, history_id, tenant_id, user_id
        )
        if not history:
            return False
        if history.workshop_id is not None:
            raise ServiceHistoryReadOnlyError(
                "This record was created by a workshop and cannot be modified by the client."
            )
        return repo_delete_service_history(self.db, history)
