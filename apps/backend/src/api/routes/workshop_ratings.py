from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.db.database import get_session
from src.repositories.user import repo_find_user_by_tenant_and_role
from src.schemas.workshop_rating import (WorkshopRatingCreate,
                                         WorkshopRatingRead,
                                         WorkshopRatingUpdate)
from src.services.notifications import NotificationService
from src.services.workshop_rating import WorkshopRatingService

router = APIRouter()


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _require_role(current_user: dict, role: str) -> None:
    if current_user.get("role") != role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only {role.lower()} users can access this resource",
        )


def _notify_workshop_new_rating(db: Session, rating) -> None:
    """Send a notification to the workshop user about the new rating."""
    workshop_user = repo_find_user_by_tenant_and_role(
        db, rating.workshop_tenant_id, "WORKSHOP"
    )
    if workshop_user:
        notif_service = NotificationService(db)
        notif_service.create_rating_notification(
            tenant_id=rating.workshop_tenant_id,
            user_id=workshop_user.id,
            schedule_id=rating.schedule_id,
            rating_value=rating.rating,
        )


# ---------------------------------------------------------------------------
# List ratings for a workshop (public read for any authenticated role)
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=list[WorkshopRatingRead],
    status_code=status.HTTP_200_OK,
    summary="List ratings for a workshop",
)
def list_workshop_ratings(
    workshop_id: int = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = WorkshopRatingService(db)
    try:
        ratings = service.get_ratings_for_workshop_public(
            workshop_id, skip=skip, limit=limit
        )
        return [service.to_read_dict(r) for r in ratings]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ---------------------------------------------------------------------------
# List my ratings (CLIENT)
# ---------------------------------------------------------------------------


@router.get(
    "/mine",
    response_model=list[WorkshopRatingRead],
    status_code=status.HTTP_200_OK,
    summary="List my own ratings",
)
def list_my_ratings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    _require_role(current_user, "CLIENT")
    service = WorkshopRatingService(db)
    ratings = service.get_ratings_for_client(
        current_user.get("tenant_id"), skip=skip, limit=limit
    )
    return [service.to_read_dict(r) for r in ratings]


# ---------------------------------------------------------------------------
# List ratings received by my workshop (WORKSHOP)
# ---------------------------------------------------------------------------


@router.get(
    "/me",
    response_model=list[WorkshopRatingRead],
    status_code=status.HTTP_200_OK,
    summary="List ratings received by my workshop",
)
def list_received_ratings(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    _require_role(current_user, "WORKSHOP")
    service = WorkshopRatingService(db)
    ratings = service.get_ratings_for_workshop(
        current_user.get("tenant_id"), skip=skip, limit=limit
    )
    return [service.to_read_dict(r) for r in ratings]


# ---------------------------------------------------------------------------
# Create a rating (CLIENT only, for an accepted schedule)
# ---------------------------------------------------------------------------


@router.post(
    "/",
    response_model=WorkshopRatingRead,
    status_code=status.HTTP_201_CREATED,
    summary="Rate an accepted schedule",
)
def create_rating(
    rating_in: WorkshopRatingCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    _require_role(current_user, "CLIENT")
    service = WorkshopRatingService(db)
    try:
        rating = service.create_rating(
            rating_in.model_dump(), current_user.get("tenant_id")
        )
        _notify_workshop_new_rating(db, rating)
        return service.to_read_dict(rating)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ---------------------------------------------------------------------------
# Get a single rating (either owning tenant)
# ---------------------------------------------------------------------------


@router.get(
    "/{rating_id}",
    response_model=WorkshopRatingRead,
    status_code=status.HTTP_200_OK,
    summary="Get a single rating by ID",
)
def get_rating(
    rating_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    role = current_user.get("role")
    if role not in ("CLIENT", "WORKSHOP"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Unknown role"
        )

    service = WorkshopRatingService(db)
    rating = service.get_rating_by_id(rating_id, current_user.get("tenant_id"))
    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rating not found"
        )
    return service.to_read_dict(rating)


# ---------------------------------------------------------------------------
# Update my rating (CLIENT, author only)
# ---------------------------------------------------------------------------


@router.put(
    "/{rating_id}",
    response_model=WorkshopRatingRead,
    status_code=status.HTTP_200_OK,
    summary="Update my own rating",
)
def update_rating(
    rating_id: int,
    rating_in: WorkshopRatingUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    _require_role(current_user, "CLIENT")
    service = WorkshopRatingService(db)
    try:
        rating = service.update_rating(
            rating_id, rating_in.model_dump(), current_user.get("tenant_id")
        )
        return service.to_read_dict(rating)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ---------------------------------------------------------------------------
# Delete my rating (CLIENT, author only)
# ---------------------------------------------------------------------------


@router.delete(
    "/{rating_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete my own rating",
)
def delete_rating(
    rating_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    _require_role(current_user, "CLIENT")
    service = WorkshopRatingService(db)
    try:
        service.delete_rating(rating_id, current_user.get("tenant_id"))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return None
