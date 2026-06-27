from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from src.core.logger import get_logger
from src.models.services_history import ServiceHistory
from src.models.vehicle import Vehicle
from src.schemas.services_history import (
    ServiceHistoryCreate,
    ServiceHistoryRead)

logger = get_logger(__name__)


def repo_create_service_history(
    db: Session, tenant_id: UUID | str, history_data: dict
) -> ServiceHistoryRead:
    logger.info(f"Creating service history record for tenant_id={tenant_id}")
    db_history = ServiceHistory(**history_data, tenant_id=tenant_id)
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history


def repo_get_services_history_for_user(
    db: Session,
    tenant_id: UUID | str,
    user_id: int,
    service_type: Optional[str] = None,
    vehicle_id: Optional[int] = None,
) -> List[ServiceHistory]:
    """List service-history records for vehicles owned by the user, scoped to the tenant."""
    query = (
        db.query(ServiceHistory)
        .join(Vehicle, ServiceHistory.vehicle_id == Vehicle.id)
        .filter(
            ServiceHistory.tenant_id == tenant_id,
            Vehicle.user_id == user_id,
        )
    )

    if service_type is not None:
        query = query.filter(ServiceHistory.service_type == service_type)
    if vehicle_id is not None:
        query = query.filter(ServiceHistory.vehicle_id == vehicle_id)

    return query.order_by(ServiceHistory.serviced_at.desc()).all()


def repo_get_service_history_by_id(
    db: Session,
    history_id: int,
    tenant_id: UUID | str,
    user_id: int,
) -> Optional[ServiceHistory]:
    """Get a single service-history record owned by the user within the tenant."""
    return (
        db.query(ServiceHistory)
        .join(Vehicle, ServiceHistory.vehicle_id == Vehicle.id)
        .filter(
            ServiceHistory.id == history_id,
            ServiceHistory.tenant_id == tenant_id,
            Vehicle.user_id == user_id,
        )
        .first()
    )


def repo_update_service_history(
    db: Session,
    history: ServiceHistory,
    update_data: dict,
) -> ServiceHistory:
    """Apply an update to a service-history record."""
    for field, value in update_data.items():
        setattr(history, field, value)

    db.commit()
    db.refresh(history)
    return history


def repo_delete_service_history(
    db: Session,
    history: ServiceHistory,
) -> bool:
    """Delete a service-history record."""
    db.delete(history)
    db.commit()
    return True
