from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from src.models.schedule import Schedule


def repo_create_schedule(db: Session, data: dict) -> Schedule:
    """Create a new schedule row. Tenant ids must be in `data`."""
    schedule = Schedule(**data)
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def repo_get_schedules_for_workshop(
    db: Session,
    workshop_tenant_id: UUID | str,
    skip: int = 0,
    limit: int = 50,
) -> list[Schedule]:
    """List schedules received by a workshop tenant, newest scheduled_at first."""
    if not workshop_tenant_id:
        raise TypeError("workshop_tenant_id is required")

    return (
        db.query(Schedule)
        .filter(Schedule.workshop_tenant_id == workshop_tenant_id)
        .order_by(Schedule.scheduled_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def repo_get_schedule_by_id(
    db: Session,
    schedule_id: int,
    workshop_tenant_id: UUID | str,
) -> Schedule | None:
    """Get a single schedule, scoped to the workshop tenant."""
    if not workshop_tenant_id:
        raise TypeError("workshop_tenant_id is required")

    return (
        db.query(Schedule)
        .filter(
            Schedule.id == schedule_id,
            Schedule.workshop_tenant_id == workshop_tenant_id,
        )
        .first()
    )


def repo_get_schedules_for_client(
    db: Session,
    client_tenant_id: UUID | str,
    skip: int = 0,
    limit: int = 50,
) -> list[Schedule]:
    """List schedules created by a client tenant, newest scheduled_at first."""
    if not client_tenant_id:
        raise TypeError("client_tenant_id is required")

    return (
        db.query(Schedule)
        .filter(Schedule.client_tenant_id == client_tenant_id)
        .order_by(Schedule.scheduled_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def repo_get_schedule_by_id_for_client(
    db: Session,
    schedule_id: int,
    client_tenant_id: UUID | str,
) -> Schedule | None:
    """Get a single schedule, scoped to the client tenant."""
    if not client_tenant_id:
        raise TypeError("client_tenant_id is required")

    return (
        db.query(Schedule)
        .filter(
            Schedule.id == schedule_id,
            Schedule.client_tenant_id == client_tenant_id,
        )
        .first()
    )


def repo_update_schedule(
    db: Session,
    schedule: Schedule,
    update_data: dict,
) -> Schedule:
    """Apply a partial update to a schedule row."""
    for field, value in update_data.items():
        setattr(schedule, field, value)
    db.commit()
    db.refresh(schedule)
    return schedule
