from sqlalchemy.orm import Session
from typing import List, Optional, Tuple

from app.src.models.workshop_client import WorkshopClient
from app.src.models.user import User
from app.src.models.vehicle import Vehicle


def repo_create_workshop_client(db: Session, workshop_id: int, user_id: int, client_data: dict) -> WorkshopClient:
    client = WorkshopClient(workshop_id=workshop_id, user_id=user_id, **client_data)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def repo_get_workshop_clients_by_workshop_id(db: Session, workshop_id: int) -> List[WorkshopClient]:
    return db.query(WorkshopClient).filter(WorkshopClient.workshop_id == workshop_id).all()


def repo_get_workshop_client_by_id(db: Session, client_id: int) -> Optional[WorkshopClient]:
    return db.query(WorkshopClient).filter(WorkshopClient.id == client_id).first()


def repo_update_workshop_client(db: Session, client_id: int, update_data: dict) -> Optional[WorkshopClient]:
    client = db.query(WorkshopClient).filter(WorkshopClient.id == client_id).first()
    if not client:
        return None

    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client


def repo_delete_workshop_client(db: Session, client_id: int) -> bool:
    client = db.query(WorkshopClient).filter(WorkshopClient.id == client_id).first()
    if not client:
        return False

    db.delete(client)
    db.commit()
    return True


def repo_check_duplicate_plate_in_workshop(db: Session, workshop_id: int, plate: str, exclude_id: Optional[int] = None) -> bool:
    query = db.query(WorkshopClient).filter(
        WorkshopClient.workshop_id == workshop_id,
        WorkshopClient.vehicle_plate == plate
    )
    if exclude_id is not None:
        query = query.filter(WorkshopClient.id != exclude_id)
    return query.first() is not None
