from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from src.models.workshop_rating import WorkshopRating


def repo_create_rating(db: Session, data: dict) -> WorkshopRating:
    """Create a new rating row. Both tenant ids and schedule_id must be in `data`."""
    rating = WorkshopRating(**data)
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating


def repo_get_rating_by_id(
    db: Session,
    rating_id: int,
    tenant_id: UUID | str,
) -> WorkshopRating | None:
    """Get a single rating visible to either owning tenant (workshop or client side)."""
    if not tenant_id:
        raise TypeError("tenant_id is required")

    return (
        db.query(WorkshopRating)
        .filter(
            WorkshopRating.id == rating_id,
            or_(
                WorkshopRating.workshop_tenant_id == tenant_id,
                WorkshopRating.client_tenant_id == tenant_id,
            ),
        )
        .first()
    )


def repo_get_rating_by_schedule(
    db: Session,
    schedule_id: int,
    client_tenant_id: UUID | str,
) -> WorkshopRating | None:
    """Get the rating for a schedule, scoped to the authoring client tenant."""
    if not client_tenant_id:
        raise TypeError("client_tenant_id is required")

    return (
        db.query(WorkshopRating)
        .filter(
            WorkshopRating.schedule_id == schedule_id,
            WorkshopRating.client_tenant_id == client_tenant_id,
        )
        .first()
    )


def repo_list_ratings_for_workshop_tenant(
    db: Session,
    workshop_tenant_id: UUID | str,
    skip: int = 0,
    limit: int = 50,
) -> list[WorkshopRating]:
    """List ratings received by a workshop tenant, newest first."""
    if not workshop_tenant_id:
        raise TypeError("workshop_tenant_id is required")

    return (
        db.query(WorkshopRating)
        .filter(WorkshopRating.workshop_tenant_id == workshop_tenant_id)
        .order_by(WorkshopRating.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def repo_list_ratings_for_client_tenant(
    db: Session,
    client_tenant_id: UUID | str,
    skip: int = 0,
    limit: int = 50,
) -> list[WorkshopRating]:
    """List ratings written by a client tenant, newest first."""
    if not client_tenant_id:
        raise TypeError("client_tenant_id is required")

    return (
        db.query(WorkshopRating)
        .filter(WorkshopRating.client_tenant_id == client_tenant_id)
        .order_by(WorkshopRating.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def repo_update_rating(
    db: Session,
    rating: WorkshopRating,
    update_data: dict,
) -> WorkshopRating:
    """Apply a partial update to a rating row."""
    for field, value in update_data.items():
        setattr(rating, field, value)
    db.commit()
    db.refresh(rating)
    return rating


def repo_delete_rating(db: Session, rating: WorkshopRating) -> None:
    """Delete a rating row."""
    db.delete(rating)
    db.commit()


def repo_average_for_workshop_tenant(
    db: Session,
    workshop_tenant_id: UUID | str,
) -> float:
    """Average rating for a workshop tenant; 0.0 when the workshop has none."""
    if not workshop_tenant_id:
        raise TypeError("workshop_tenant_id is required")

    avg = (
        db.query(func.avg(WorkshopRating.rating))
        .filter(WorkshopRating.workshop_tenant_id == workshop_tenant_id)
        .scalar()
    )
    return float(avg) if avg is not None else 0.0
