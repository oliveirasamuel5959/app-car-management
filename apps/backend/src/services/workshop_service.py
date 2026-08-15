from uuid import UUID

from sqlalchemy.orm import Session

from src.models.workshop_service import WorkshopService
from src.repositories.workshop import repo_get_workshop_for_user
from src.repositories.workshop_service import (repo_list_workshop_services,
                                               repo_replace_workshop_services)


class WorkshopServiceService:
    """Business rules for the workshop service catalog (what a workshop offers)."""

    def __init__(self, db: Session):
        self.db = db

    def _resolve_workshop(self, user_id: int, tenant_id: UUID | str):
        workshop = repo_get_workshop_for_user(self.db, user_id, tenant_id)
        if not workshop:
            raise ValueError("Workshop profile not found")
        return workshop

    def get_my_services(
        self,
        user_id: int,
        tenant_id: UUID | str,
    ) -> list[WorkshopService]:
        workshop = self._resolve_workshop(user_id, tenant_id)
        return repo_list_workshop_services(self.db, tenant_id, workshop.id)

    def set_my_services(
        self,
        user_id: int,
        tenant_id: UUID | str,
        service_types: list[str],
    ) -> list[WorkshopService]:
        workshop = self._resolve_workshop(user_id, tenant_id)
        # Preserve first-occurrence order while dropping duplicate types
        deduped = list(dict.fromkeys(service_types))
        return repo_replace_workshop_services(self.db, tenant_id, workshop.id, deduped)
