from typing import List
from src.models.user import User
from sqlalchemy.orm import Session

from src.repositories.workshop import (
    repo_create_workshop,
    repo_get_workshop_by_id,
    repo_get_workshop_by_id_for_client,
    repo_get_workshop_for_user,
    repo_get_workshop_all_clients,
    repo_get_workshops_nearby,
)
from src.schemas.workshop import WorkshopCreate
from src.models.workshop import Workshop


class WorkshopService:
    def __init__(self, db: Session):
        self.db = db

    def create_workshop(self, workshop_in: WorkshopCreate, user_id: int, tenant_id) -> Workshop:
        # additional business rules could be added here
        return repo_create_workshop(self.db, tenant_id=tenant_id, user_id=user_id, workshop_data=workshop_in.dict())

    def get_current_workshop(self, user_id: int, tenant_id) -> Workshop:
        workshop = repo_get_workshop_for_user(self.db, user_id, tenant_id)
        if not workshop:
            raise ValueError("Workshop profile not found")
        return workshop

    def get_workshop_by_id(self, workshop_id: int, tenant_id) -> Workshop:
        workshop = repo_get_workshop_by_id(self.db, workshop_id, tenant_id)
        if not workshop:
            raise ValueError(f"Workshop {workshop_id} not found")
        return workshop

    def get_workshop_by_client_access(self, workshop_id: int, user_id: int, user_email: str | None = None) -> Workshop:
        workshop = repo_get_workshop_by_id_for_client(self.db, workshop_id, user_id, user_email=user_email)
        if not workshop:
            raise ValueError(f"Workshop {workshop_id} not found")
        return workshop

    def get_nearby_workshops(self, tenant_id, lat: float, lng: float, radius_km: float = 10.0) -> List[Workshop]:
        # service handled radius calculation (defaults to 10km)
        return repo_get_workshops_nearby(self.db, tenant_id, lat, lng, radius_km)

    def get_all_clients(self, workshop_id: int, tenant_id) -> List[User]:
        """
        Return all distinct CLIENT users that have services
        in the specified workshop.
        """
        clients = repo_get_workshop_all_clients(self.db, workshop_id, tenant_id)

        if not clients:
            return []

        return clients
