from typing import List
from app.src.models.user import User
from sqlalchemy.orm import Session

from app.src.repositories.workshop import (
    repo_create_workshop,
    repo_get_workshop_by_id,
    repo_get_workshop_all_clients,
    repo_get_workshops_nearby,
)
from app.src.schemas.workshop import WorkshopCreate
from app.src.models.workshop import Workshop


class WorkshopService:
    def __init__(self, db: Session):
        self.db = db

    def create_workshop(self, workshop_in: WorkshopCreate, user_id: int) -> Workshop:
        # additional business rules could be added here
        return repo_create_workshop(self.db, user_id=user_id, workshop_data=workshop_in.dict())

    def get_workshop_by_id(self, workshop_id: int) -> Workshop:
        workshop = repo_get_workshop_by_id(self.db, workshop_id)
        if not workshop:
            raise ValueError(f"Workshop {workshop_id} not found")
        return workshop

    def get_nearby_workshops(self, lat: float, lng: float, radius_km: float = 10.0) -> List[Workshop]:
        # service handled radius calculation (defaults to 10km)
        return repo_get_workshops_nearby(self.db, lat, lng, radius_km)

    def get_all_clients(self, workshop_id: int) -> List[User]:
        """
        Return all distinct CLIENT users that have services
        in the specified workshop.
        """
        clients = repo_get_workshop_all_clients(self.db, workshop_id)

        if not clients:
            return []

        return clients