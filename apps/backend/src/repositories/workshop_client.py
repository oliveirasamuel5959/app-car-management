from uuid import UUID

from sqlalchemy.orm import Session

from src.core.logger import get_logger
from src.models.workshop_client import WorkshopClient

logger = get_logger(__name__)


def repo_create_workshop_client(
    db: Session,
    tenant_id: UUID | str,
    workshop_id: int,
    user_id: int | None,
    client_data: dict,
) -> WorkshopClient:
    logger.debug(
        f"Creating workshop client with data: {client_data}, workshop_id: {workshop_id}, user_id: {user_id}, tenant_id: {tenant_id}"
    )

    client = WorkshopClient(
        tenant_id=tenant_id, workshop_id=workshop_id, user_id=user_id, **client_data
    )
    db.add(client)
    db.commit()
    db.refresh(client)

    logger.info(
        f"Created workshop client with ID: {client.id} for workshop_id: {workshop_id}, user_id: {user_id}, tenant_id: {tenant_id}"
    )

    return client


def repo_get_workshop_clients_by_workshop_id(
    db: Session, workshop_id: int, tenant_id: UUID | str
) -> list[WorkshopClient]:
    return (
        db.query(WorkshopClient)
        .filter(
            WorkshopClient.workshop_id == workshop_id,
            WorkshopClient.tenant_id == tenant_id,
        )
        .all()
    )


def repo_get_workshop_client_by_id(
    db: Session, client_id: int, tenant_id: UUID | str
) -> WorkshopClient | None:
    return (
        db.query(WorkshopClient)
        .filter(WorkshopClient.id == client_id, WorkshopClient.tenant_id == tenant_id)
        .first()
    )


def repo_update_workshop_client(
    db: Session, client_id: int, tenant_id: UUID | str, update_data: dict
) -> WorkshopClient | None:
    client = (
        db.query(WorkshopClient)
        .filter(WorkshopClient.id == client_id, WorkshopClient.tenant_id == tenant_id)
        .first()
    )
    if not client:
        return None

    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return client


def repo_delete_workshop_client(
    db: Session, client_id: int, tenant_id: UUID | str
) -> bool:
    client = (
        db.query(WorkshopClient)
        .filter(WorkshopClient.id == client_id, WorkshopClient.tenant_id == tenant_id)
        .first()
    )
    if not client:
        return False

    db.delete(client)
    db.commit()
    return True


def repo_check_duplicate_plate_in_workshop(
    db: Session,
    tenant_id: UUID | str,
    workshop_id: int,
    plate: str,
    exclude_id: int | None = None,
) -> bool:
    query = db.query(WorkshopClient).filter(
        WorkshopClient.workshop_id == workshop_id,
        WorkshopClient.tenant_id == tenant_id,
        WorkshopClient.vehicle_plate == plate,
    )
    if exclude_id is not None:
        query = query.filter(WorkshopClient.id != exclude_id)
    return query.first() is not None
