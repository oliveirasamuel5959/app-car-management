from uuid import UUID

from sqlalchemy.orm import Session

from src.models.workshop_service import WorkshopService


def repo_list_workshop_services(
    db: Session,
    tenant_id: UUID | str,
    workshop_id: int,
) -> list[WorkshopService]:
    """List the service types a workshop offers, scoped to its tenant."""
    if not tenant_id:
        raise TypeError("tenant_id is required")

    return (
        db.query(WorkshopService)
        .filter(
            WorkshopService.workshop_id == workshop_id,
            WorkshopService.tenant_id == tenant_id,
        )
        .order_by(WorkshopService.id)
        .all()
    )


def repo_replace_workshop_services(
    db: Session,
    tenant_id: UUID | str,
    workshop_id: int,
    service_types: list[str],
) -> list[WorkshopService]:
    """Delete-then-insert the workshop's offered service types (bulk replace)."""
    if not tenant_id:
        raise TypeError("tenant_id is required")

    db.query(WorkshopService).filter(
        WorkshopService.workshop_id == workshop_id,
        WorkshopService.tenant_id == tenant_id,
    ).delete(synchronize_session=False)

    rows = [
        WorkshopService(workshop_id=workshop_id, tenant_id=tenant_id, service_type=st)
        for st in service_types
    ]
    db.add_all(rows)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows
