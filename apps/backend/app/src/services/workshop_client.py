from sqlalchemy.orm import Session
from typing import List, Optional

from app.src.models.workshop import Workshop
from app.src.models.workshop_client import WorkshopClient
from app.src.repositories.workshop_client import (
    repo_create_workshop_client,
    repo_get_workshop_clients_by_workshop_id,
    repo_get_workshop_client_by_id,
    repo_update_workshop_client,
    repo_delete_workshop_client,
    repo_check_duplicate_plate_in_workshop,
)

from app.src.repositories.user import repo_email_exists, repo_get_user_by_email
from app.src.repositories.vehicle import repo_get_vehicle_by_id
from app.src.schemas.workshop_client import WorkshopClientCreate, WorkshopClientUpdate


class WorkshopClientService:
    def __init__(self, db: Session):
        self.db = db

    def _get_workshop_for_user(self, user_id: int) -> Workshop:
        workshop = self.db.query(Workshop).filter(Workshop.user_id == user_id).first()
        if not workshop:
            raise ValueError("No workshop found for current user")
        return workshop

    def create_client(self, client_in: WorkshopClientCreate, user_id: int) -> WorkshopClient:
        
        workshop = self._get_workshop_for_user(user_id)
        user = repo_get_user_by_email(self.db, client_in.email) if client_in.email else None
        
        user_id_for_client = user.id
        
        if client_in.email and not repo_email_exists(self.db, client_in.email):
            raise ValueError(f"Email '{client_in.email}' is not registered in the system")
        
        if repo_check_duplicate_plate_in_workshop(self.db, workshop.id, client_in.vehicle_plate):
            raise ValueError(f"A client with plate '{client_in.vehicle_plate}' already exists in this workshop")

        return repo_create_workshop_client(self.db, workshop.id, user_id_for_client, client_in.dict())

    def get_clients(self, user_id: int) -> List[WorkshopClient]:
        workshop = self._get_workshop_for_user(user_id)
        return repo_get_workshop_clients_by_workshop_id(self.db, workshop.id)

    def get_client_by_id(self, client_id: int, user_id: int) -> Optional[WorkshopClient]:
        workshop = self._get_workshop_for_user(user_id)
        client = repo_get_workshop_client_by_id(self.db, client_id)
        if not client or client.workshop_id != workshop.id:
            return None
        return client

    def update_client(self, client_id: int, update_in: WorkshopClientUpdate, user_id: int) -> Optional[WorkshopClient]:
        workshop = self._get_workshop_for_user(user_id)
        client = repo_get_workshop_client_by_id(self.db, client_id)
        if not client or client.workshop_id != workshop.id:
            return None

        update_data = update_in.dict(exclude_unset=True)

        if "vehicle_plate" in update_data:
            if repo_check_duplicate_plate_in_workshop(self.db, workshop.id, update_data["vehicle_plate"], exclude_id=client_id):
                raise ValueError(f"A client with plate '{update_data['vehicle_plate']}' already exists in this workshop")

        return repo_update_workshop_client(self.db, client_id, update_data)

    def delete_client(self, client_id: int, user_id: int) -> bool:
        workshop = self._get_workshop_for_user(user_id)
        client = repo_get_workshop_client_by_id(self.db, client_id)
        if not client or client.workshop_id != workshop.id:
            return False
        return repo_delete_workshop_client(self.db, client_id)
