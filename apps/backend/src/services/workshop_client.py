from sqlalchemy.orm import Session
from typing import List, Optional

from src.models.user import User
from src.models.workshop import Workshop
from src.models.workshop_client import WorkshopClient
from src.repositories.workshop_client import (
    repo_create_workshop_client,
    repo_get_workshop_clients_by_workshop_id,
    repo_get_workshop_client_by_id,
    repo_update_workshop_client,
    repo_delete_workshop_client,
    repo_check_duplicate_plate_in_workshop,
)

from src.repositories.user import repo_get_user_by_email
from src.schemas.workshop_client import WorkshopClientCreate, WorkshopClientUpdate
from src.core.logger import get_logger

logger = get_logger(__name__)

class WorkshopClientService:
    def __init__(self, db: Session):
        self.db = db

    def _get_workshop_for_user(self, user_id: int, tenant_id) -> Workshop:
        workshop = self.db.query(Workshop).filter(Workshop.user_id == user_id, Workshop.tenant_id == tenant_id).first()
        if not workshop:
            logger.error(f"No workshop found for user_id {user_id} and tenant_id {tenant_id}")
            raise ValueError("No workshop found for the given user and tenant")
        return workshop

    def _resolve_registered_client_user(self, email: str | None, tenant_id) -> User | None:
        if not email:
            return None

        user = repo_get_user_by_email(self.db, email, tenant_id=tenant_id)
        if user:
            return user

        candidates = (
            self.db.query(User)
            .filter(User.email == email, User.role == "CLIENT", User.is_active.is_(True))
            .all()
        )
        if len(candidates) == 1:
            return candidates[0]
        return None

    def _backfill_client_user_links(self, clients: List[WorkshopClient], tenant_id) -> None:
        updated = False
        for client in clients:
            if client.user_id is not None or not client.email:
                continue

            resolved_user = self._resolve_registered_client_user(client.email, tenant_id)
            if resolved_user and client.user_id != resolved_user.id:
                client.user_id = resolved_user.id
                updated = True

        if updated:
            self.db.commit()
            for client in clients:
                self.db.refresh(client)

    def create_client(self, client_in: WorkshopClientCreate, user_id: int, tenant_id) -> WorkshopClient:
        logger.info(
            "Service called to create workshop client with email: %s, vehicle_plate: %s, user_id: %s, tenant_id: %s",
            client_in.email,
            client_in.vehicle_plate,
            user_id,
            tenant_id,
        )
        
        workshop = self._get_workshop_for_user(user_id, tenant_id)
        user = self._resolve_registered_client_user(client_in.email, tenant_id)
        user_id_for_client = user.id if user else None
        
        if repo_check_duplicate_plate_in_workshop(self.db, tenant_id, workshop.id, client_in.vehicle_plate):
            logger.warning(
                "A client with plate '%s' already exists in workshop '%s'",
                client_in.vehicle_plate,
                workshop.id,
            )
            raise ValueError(f"A client with plate '{client_in.vehicle_plate}' already exists in this workshop")

        return repo_create_workshop_client(self.db, tenant_id, workshop.id, user_id_for_client, client_in.model_dump())

    def get_clients(self, user_id: int, tenant_id) -> List[WorkshopClient]:
        workshop = self._get_workshop_for_user(user_id, tenant_id)
        clients = repo_get_workshop_clients_by_workshop_id(self.db, workshop.id, tenant_id)
        self._backfill_client_user_links(clients, tenant_id)
        return clients

    def get_client_by_id(self, client_id: int, user_id: int, tenant_id) -> Optional[WorkshopClient]:
        workshop = self._get_workshop_for_user(user_id, tenant_id)
        client = repo_get_workshop_client_by_id(self.db, client_id, tenant_id)
        if client:
            self._backfill_client_user_links([client], tenant_id)
        if not client or client.workshop_id != workshop.id:
            return None
        return client

    def update_client(self, client_id: int, update_in: WorkshopClientUpdate, user_id: int, tenant_id) -> Optional[WorkshopClient]:
        workshop = self._get_workshop_for_user(user_id, tenant_id)
        client = repo_get_workshop_client_by_id(self.db, client_id, tenant_id)
        if not client or client.workshop_id != workshop.id:
            return None

        update_data = update_in.model_dump(exclude_unset=True)

        if "vehicle_plate" in update_data:
            if repo_check_duplicate_plate_in_workshop(self.db, tenant_id, workshop.id, update_data["vehicle_plate"], exclude_id=client_id):
                raise ValueError(f"A client with plate '{update_data['vehicle_plate']}' already exists in this workshop")

        return repo_update_workshop_client(self.db, client_id, tenant_id, update_data)

    def delete_client(self, client_id: int, user_id: int, tenant_id) -> bool:
        workshop = self._get_workshop_for_user(user_id, tenant_id)
        client = repo_get_workshop_client_by_id(self.db, client_id, tenant_id)
        if not client or client.workshop_id != workshop.id:
            return False
        return repo_delete_workshop_client(self.db, client_id, tenant_id)
