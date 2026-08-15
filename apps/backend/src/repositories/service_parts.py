from uuid import UUID

from sqlalchemy.orm import Session

from src.core.logger import get_logger
from src.models.service_part import ServicePart

logger = get_logger(__name__)


def repo_create_service_part(
    db: Session,
    tenant_id: UUID | str,
    *,
    service_order_id: int,
    description: str,
    quantity: int,
    unit_price: float,
    total_price: float,
) -> ServicePart:
    logger.info(f"Creating service part for order {service_order_id}")
    db_part = ServicePart(
        tenant_id=tenant_id,
        service_order_id=service_order_id,
        description=description,
        quantity=quantity,
        unit_price=unit_price,
        total_price=total_price,
    )
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part


def repo_get_service_parts_for_order(
    db: Session, tenant_id: UUID | str, service_order_id: int
) -> list[ServicePart]:
    """List the parts of a service order, always scoped to the tenant."""
    return (
        db.query(ServicePart)
        .filter(
            ServicePart.tenant_id == tenant_id,
            ServicePart.service_order_id == service_order_id,
        )
        .order_by(ServicePart.id.asc())
        .all()
    )
