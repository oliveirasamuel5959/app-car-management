from datetime import UTC, datetime

from sqlalchemy.orm import Session

from src.core.logger import get_logger
from src.models.services import Service
from src.models.user import User
from src.repositories.services import (
    repo_create_service,
    repo_delete_service,
    repo_get_all_services,
    repo_get_service_by_id,
    repo_get_service_by_user_id,
    repo_get_service_for_workshop_user,
    repo_get_services_by_user_id,
    repo_get_services_by_vehicle_id,
    repo_get_services_by_workshop_client_id,
    repo_get_services_by_workshop_id,
    repo_update_service,
    repo_update_service_by_current_workshop,
)
from src.repositories.vehicle import (
    repo_get_vehicle_by_id,
    repo_get_vehicle_by_user_id,
)
from src.repositories.workshop import (
    repo_get_workshop_by_id,
    repo_get_workshop_for_user,
)
from src.repositories.workshop_client import repo_get_workshop_client_by_id
from src.schemas.services import ServiceActionUpdate, ServiceCreate, ServiceSummaryRead
from src.services.notifications import NotificationService
from src.services.services_history import ServiceHistoryService

logger = get_logger(__name__)


SERVICE_STATUS_PENDING = "pending"
SERVICE_STATUS_CONFIRMED = "confirmed"
SERVICE_STATUS_IN_PROGRESS = "in_progress"
SERVICE_STATUS_COMPLETED = "completed"
SERVICE_STATUS_CANCELLED = "cancelled"

VALID_SERVICE_STATUSES = {
    SERVICE_STATUS_PENDING,
    SERVICE_STATUS_CONFIRMED,
    SERVICE_STATUS_IN_PROGRESS,
    SERVICE_STATUS_COMPLETED,
    SERVICE_STATUS_CANCELLED,
}

# Fields on ServiceActionUpdate that only feed the auto-created service-history
# record on completion; they aren't real columns on Service and must never
# reach repo_update_service's blind setattr loop.
SERVICE_HISTORY_ONLY_FIELDS = {
    "service_type",
    "current_mileage",
    "labor_cost",
    "parts_cost",
    "invoice_number",
    "warranty_until_date",
    "warranty_mileage",
}


class ServiceService:
    def __init__(self, db: Session):
        self.db = db

    def create_service(
        self, service_in: ServiceCreate, user_id: int, tenant_id
    ) -> Service:
        """Create a new service with validation."""
        # Derive workshop from current user

        workshop = repo_get_workshop_for_user(self.db, user_id, tenant_id)
        if not workshop:
            raise ValueError("No workshop found for current user")

        client = repo_get_workshop_client_by_id(
            self.db, service_in.workshop_client_id, tenant_id
        )
        if not client:
            raise ValueError(f"No client found for workshop id {workshop.id}")

        vehicle = repo_get_vehicle_by_user_id(self.db, user_id=client.user_id)
        if not vehicle:
            raise ValueError(f"No vehicle found for user id {client.user_id}")

        logger.info(f"Vehicle info: {vehicle.id}")

        # if service_in.workshop_client_id:
        #     client = repo_get_workshop_client_by_id(self.db, service_in.workshop_client_id, tenant_id)

        # Validate exactly one of vehicle_id or workshop_client_id
        # if service_in.vehicle_id and service_in.workshop_client_id:
        #     raise ValueError("Provide either vehicle_id or workshop_client_id, not both")

        # if not service_in.vehicle_id and not service_in.workshop_client_id:
        #     raise ValueError("Either vehicle_id or workshop_client_id must be provided")

        # Validate the referenced entity
        if service_in.workshop_client_id:
            if not client or client.workshop_id != workshop.id:
                raise ValueError(
                    "Workshop client not found or does not belong to your workshop"
                )

        # Validate status
        if service_in.status not in VALID_SERVICE_STATUSES:
            raise ValueError(
                f"Invalid status. Must be one of: {', '.join(sorted(VALID_SERVICE_STATUSES))}"
            )

        # Validate progress_percentage
        if not (0 <= service_in.progress_percentage <= 100):
            raise ValueError("Progress percentage must be between 0 and 100")

        # Build service data with workshop_id
        service_data = service_in.model_dump()
        service_data["workshop_id"] = workshop.id
        service_data["status"] = SERVICE_STATUS_PENDING
        service_data["progress_percentage"] = 0
        service_data["vehicle_id"] = vehicle.id

        created_service = repo_create_service(
            self.db, tenant_id=tenant_id, service_data=service_data
        )
        self._notify_status_change(
            created_service,
            "created",
            tenant_id,
            actor_role="WORKSHOP",
            actor_user_id=user_id,
        )
        return created_service

    def _get_client_owned_service(
        self, service_id: int, user_id: int, user_email: str | None = None
    ) -> Service | None:
        return repo_get_service_by_user_id(
            self.db, service_id, user_id, None, user_email=user_email
        )

    def _build_summary(self, services: list[Service]) -> ServiceSummaryRead:
        ordered_services = sorted(
            services,
            key=lambda service: service.checkin_date or datetime.min,
            reverse=True,
        )
        return ServiceSummaryRead(
            total_orders=len(services),
            active_orders=sum(
                service.status
                in {
                    SERVICE_STATUS_PENDING,
                    SERVICE_STATUS_CONFIRMED,
                    SERVICE_STATUS_IN_PROGRESS,
                }
                for service in services
            ),
            pending_orders=sum(
                service.status == SERVICE_STATUS_PENDING for service in services
            ),
            confirmed_orders=sum(
                service.status == SERVICE_STATUS_CONFIRMED for service in services
            ),
            in_progress_orders=sum(
                service.status == SERVICE_STATUS_IN_PROGRESS for service in services
            ),
            completed_orders=sum(
                service.status == SERVICE_STATUS_COMPLETED for service in services
            ),
            cancelled_orders=sum(
                service.status == SERVICE_STATUS_CANCELLED for service in services
            ),
            recent_orders=[
                {
                    "id": service.id,
                    "name": service.name,
                    "status": service.status,
                    "checkin_date": service.checkin_date,
                    "estimated_finish_date": service.estimated_finish_date,
                    "workshop_id": service.workshop_id,
                    "estimated_cost": service.estimated_cost,
                    "progress_percentage": service.progress_percentage,
                }
                for service in ordered_services[:5]
            ],
        )

    def get_client_summary(
        self, user_id: int, user_email: str | None = None
    ) -> ServiceSummaryRead:
        services = repo_get_services_by_user_id(
            self.db, user_id, None, user_email=user_email
        )
        return self._build_summary(services)

    def get_service_order_for_workshop(
        self, service_id: int, user_id: int, tenant_id
    ) -> Service | None:
        return repo_get_service_for_workshop_user(
            self.db, tenant_id, user_id, service_id
        )

    def get_service_order_for_client(
        self, service_id: int, user_id: int, user_email: str | None = None
    ) -> Service | None:
        return self._get_client_owned_service(
            service_id, user_id, user_email=user_email
        )

    def _validate_transition(
        self, current_status: str, next_status: str, actor_role: str
    ):
        allowed_transitions = {
            SERVICE_STATUS_PENDING: {
                SERVICE_STATUS_CONFIRMED: {"CLIENT"},
                SERVICE_STATUS_CANCELLED: {"CLIENT", "WORKSHOP"},
            },
            SERVICE_STATUS_CONFIRMED: {
                SERVICE_STATUS_IN_PROGRESS: {"WORKSHOP"},
                SERVICE_STATUS_CANCELLED: {"WORKSHOP"},
            },
            SERVICE_STATUS_IN_PROGRESS: {
                SERVICE_STATUS_COMPLETED: {"WORKSHOP"},
                SERVICE_STATUS_CANCELLED: {"WORKSHOP"},
            },
            SERVICE_STATUS_COMPLETED: {},
            SERVICE_STATUS_CANCELLED: {},
        }

        if next_status not in VALID_SERVICE_STATUSES:
            raise ValueError(
                f"Invalid status. Must be one of: {', '.join(sorted(VALID_SERVICE_STATUSES))}"
            )

        valid_targets = allowed_transitions.get(current_status, {})
        allowed_roles = valid_targets.get(next_status)
        if not allowed_roles or actor_role not in allowed_roles:
            raise ValueError(
                f"Cannot transition service order from {current_status} to {next_status} as {actor_role}"
            )

    def _client_recipient_user_ids(self, service: Service, tenant_id) -> set[int]:
        recipient_ids: set[int] = set()
        if service.workshop_client_id:
            workshop_client = repo_get_workshop_client_by_id(
                self.db, service.workshop_client_id, tenant_id
            )
            if workshop_client and workshop_client.user_id:
                recipient_ids.add(workshop_client.user_id)

        if service.vehicle_id:
            vehicle = repo_get_vehicle_by_id(self.db, service.vehicle_id, tenant_id)
            if vehicle and vehicle.user_id:
                recipient_ids.add(vehicle.user_id)

        return recipient_ids

    def _workshop_recipient_user_ids(self, service: Service, tenant_id) -> set[int]:
        recipient_ids: set[int] = set()
        if service.workshop and service.workshop.user_id:
            recipient_ids.add(service.workshop.user_id)
            return recipient_ids

        workshop = repo_get_workshop_by_id(self.db, service.workshop_id, tenant_id)
        if workshop and workshop.user_id:
            recipient_ids.add(workshop.user_id)

        return recipient_ids

    def _notify_status_change(
        self,
        service: Service,
        old_status: str,
        tenant_id,
        actor_role: str,
        actor_user_id: int,
    ):
        if old_status == service.status:
            return

        if actor_role == "WORKSHOP":
            recipient_ids = self._client_recipient_user_ids(service, tenant_id)
        elif actor_role == "CLIENT":
            recipient_ids = self._workshop_recipient_user_ids(service, tenant_id)
        else:
            recipient_ids = self._workshop_recipient_user_ids(
                service, tenant_id
            ) | self._client_recipient_user_ids(service, tenant_id)

        recipient_ids.discard(actor_user_id)

        notification_service = NotificationService(self.db)
        for recipient_id in recipient_ids:
            recipient = self.db.query(User).filter(User.id == recipient_id).first()
            recipient_tenant_id = recipient.tenant_id if recipient else tenant_id
            notification_service.create_status_change_notification(
                tenant_id=recipient_tenant_id,
                user_id=recipient_id,
                service_name=service.name,
                old_status=old_status,
                new_status=service.status,
                service_id=service.id,
            )

    def transition_service_order_for_workshop(
        self,
        *,
        service_id: int,
        user_id: int,
        tenant_id,
        next_status: str,
        update: ServiceActionUpdate | None = None,
    ) -> Service | None:
        service = repo_get_service_for_workshop_user(
            self.db, tenant_id, user_id, service_id
        )
        if not service:
            return None

        self._validate_transition(service.status, next_status, "WORKSHOP")
        update_data = update.model_dump(exclude_unset=True) if update else {}
        history_fields = {
            key: update_data.pop(key)
            for key in list(update_data)
            if key in SERVICE_HISTORY_ONLY_FIELDS
        }
        update_data["status"] = next_status

        if (
            next_status == SERVICE_STATUS_IN_PROGRESS
            and "progress_percentage" not in update_data
        ):
            update_data["progress_percentage"] = max(service.progress_percentage, 25)
        if next_status == SERVICE_STATUS_COMPLETED:
            update_data["progress_percentage"] = 100
            update_data["finished_at"] = datetime.now(UTC).replace(tzinfo=None)
            if "final_cost" not in update_data and service.estimated_cost is not None:
                update_data["final_cost"] = service.estimated_cost
        if next_status == SERVICE_STATUS_CANCELLED:
            update_data["progress_percentage"] = min(service.progress_percentage, 100)

        old_status = service.status
        updated_service = repo_update_service(self.db, service, update_data)

        logger.info(f"Next Status {next_status}")

        if next_status == SERVICE_STATUS_COMPLETED:
            service_type_value = getattr(
                history_fields.get("service_type"),
                "value",
                history_fields.get("service_type"),
            )
            ServiceHistoryService(self.db).create_service_history_from_completion(
                tenant_id=tenant_id,
                workshop_id=updated_service.workshop_id,
                vehicle_id=updated_service.vehicle_id,
                workshop_client_id=updated_service.workshop_client_id,
                service_type=service_type_value,
                current_mileage=history_fields.get("current_mileage"),
                serviced_at=updated_service.finished_at,
                labor_cost=history_fields.get("labor_cost"),
                parts_cost=history_fields.get("parts_cost"),
                invoice_number=history_fields.get("invoice_number"),
                warranty_until_date=history_fields.get("warranty_until_date"),
                warranty_mileage=history_fields.get("warranty_mileage"),
            )

        self._notify_status_change(
            updated_service,
            old_status,
            tenant_id,
            actor_role="WORKSHOP",
            actor_user_id=user_id,
        )
        return updated_service

    def accept_service_order_for_client(
        self,
        *,
        service_id: int,
        user_id: int,
        user_email: str | None = None,
    ) -> Service | None:
        service = self._get_client_owned_service(
            service_id, user_id, user_email=user_email
        )
        if not service:
            return None

        self._validate_transition(service.status, SERVICE_STATUS_CONFIRMED, "CLIENT")
        old_status = service.status
        updated_service = repo_update_service(
            self.db,
            service,
            {
                "status": SERVICE_STATUS_CONFIRMED,
                "progress_percentage": max(service.progress_percentage, 10),
            },
        )
        self._notify_status_change(
            updated_service,
            old_status,
            updated_service.tenant_id,
            actor_role="CLIENT",
            actor_user_id=user_id,
        )
        return updated_service

    def cancel_service_order_for_actor(
        self,
        *,
        service_id: int,
        actor_role: str,
        user_id: int,
        tenant_id=None,
        user_email: str | None = None,
        update: ServiceActionUpdate | None = None,
    ) -> Service | None:
        if actor_role == "WORKSHOP":
            service = repo_get_service_for_workshop_user(
                self.db, tenant_id, user_id, service_id
            )
        else:
            service = self._get_client_owned_service(
                service_id, user_id, user_email=user_email
            )

        if not service:
            return None

        self._validate_transition(service.status, SERVICE_STATUS_CANCELLED, actor_role)
        update_data = update.model_dump(exclude_unset=True) if update else {}
        update_data["status"] = SERVICE_STATUS_CANCELLED

        old_status = service.status
        updated_service = repo_update_service(self.db, service, update_data)
        self._notify_status_change(
            updated_service,
            old_status,
            updated_service.tenant_id,
            actor_role=actor_role,
            actor_user_id=user_id,
        )
        return updated_service

    def get_service_by_id(self, service_id: int, tenant_id) -> Service | None:
        """Get a service by ID."""
        return repo_get_service_by_id(self.db, service_id, tenant_id)

    def get_service_by_client_access(
        self,
        service_id: int,
        user_id: int,
        user_email: str | None = None,
        tenant_id=None,
    ) -> Service | None:
        """Get a service visible to a client, allowing cross-tenant workshop ownership."""
        return repo_get_service_by_user_id(
            self.db, service_id, user_id, tenant_id, user_email=user_email
        )

    def get_services_by_workshop_id(self, workshop_id: int, tenant_id) -> list[Service]:
        """Get all services for a workshop."""
        return repo_get_services_by_workshop_id(self.db, workshop_id, tenant_id)

    def get_services_by_vehicle_id(self, vehicle_id: int, tenant_id) -> list[Service]:
        """Get all services for a vehicle."""
        return repo_get_services_by_vehicle_id(self.db, vehicle_id, tenant_id)

    def get_services_by_workshop_client_id(
        self, workshop_client_id: int, tenant_id
    ) -> list[Service]:
        """Get all services for a workshop client."""
        return repo_get_services_by_workshop_client_id(
            self.db, workshop_client_id, tenant_id
        )

    def get_services_by_user_id(
        self, user_id: int, tenant_id, user_email: str | None = None
    ) -> list[Service]:
        """Get all services that belong to a specific user via vehicles."""
        return repo_get_services_by_user_id(
            self.db, user_id, tenant_id, user_email=user_email
        )

    def get_all_services(self, tenant_id) -> list[Service]:
        """Get all services."""
        return repo_get_all_services(self.db, tenant_id)

    def update_service_by_user_id(
        self, user_id: int, tenant_id, service_id: int, service_data: dict
    ) -> Service | None:
        """Update a service."""
        # Get the current service to compare status
        current_service = repo_get_service_by_id(self.db, service_id, tenant_id)
        if not current_service:
            return None

        # Validate status if provided
        if (
            "status" in service_data
            and service_data["status"] not in VALID_SERVICE_STATUSES
        ):
            raise ValueError(
                f"Invalid status. Must be one of: {', '.join(sorted(VALID_SERVICE_STATUSES))}"
            )

        # Validate progress_percentage if provided
        if "progress_percentage" in service_data:
            if not (0 <= service_data["progress_percentage"] <= 100):
                raise ValueError("Progress percentage must be between 0 and 100")

        update_dict = service_data.model_dump(exclude_unset=True)
        print(f"[DEBUG] Updating service {service_id}: {update_dict}")

        # Update the service
        updated_service = repo_update_service_by_current_workshop(
            self.db, tenant_id, user_id, service_id, update_dict
        )

        # Create notification if status changed
        if (
            updated_service
            and "status" in update_dict
            and update_dict["status"] != current_service.status
        ):
            print(
                f"[DEBUG] Status changed from {current_service.status} to {update_dict['status']}"
            )
            try:
                self._notify_status_change(
                    updated_service,
                    current_service.status,
                    tenant_id,
                    actor_role="WORKSHOP",
                    actor_user_id=user_id,
                )
            except Exception as e:
                print(f"[ERROR] Error creating notification: {e}")
                import traceback

                traceback.print_exc()
        else:
            if not updated_service:
                print("[DEBUG] Service not updated")
            elif "status" not in update_dict:
                print("[DEBUG] Status not in update_dict")
            else:
                print(
                    f"[DEBUG] Status not changed: {current_service.status} == {update_dict['status']}"
                )

        return updated_service

    def delete_service(self, service_id: int, tenant_id) -> bool:
        """Delete a service."""
        return repo_delete_service(self.db, service_id, tenant_id)
