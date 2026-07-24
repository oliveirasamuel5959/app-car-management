from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.db.database import get_session
from src.schemas.schedules import ScheduleRead
from src.services.schedules import ScheduleService

router = APIRouter()


def _resolve_workshop_tenant_id(current_user: dict) -> str:
    """Extract tenant_id from JWT; callers must already be WORKSHOP."""
    return current_user.get("tenant_id")


# ---------------------------------------------------------------------------
# Workshop-side endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=list[ScheduleRead],
    status_code=status.HTTP_200_OK,
    summary="List received schedules for the workshop",
)
def list_schedules_for_workshop(
    workshop_tenant_id: str = Query("me"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshop users can access this resource",
        )

    tenant_id = (
        _resolve_workshop_tenant_id(current_user)
        if workshop_tenant_id == "me"
        else workshop_tenant_id
    )

    service = ScheduleService(db)
    return service.get_schedules_for_workshop(tenant_id, skip=skip, limit=limit)


@router.get(
    "/{schedule_id}",
    response_model=ScheduleRead,
    status_code=status.HTTP_200_OK,
    summary="Get a single schedule by ID (workshop view)",
)
def get_schedule(
    schedule_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshop users can access this resource",
        )

    tenant_id = _resolve_workshop_tenant_id(current_user)
    service = ScheduleService(db)

    schedule = service.get_schedule_by_id(schedule_id, tenant_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found"
        )

    return schedule


@router.patch(
    "/{schedule_id}/view",
    response_model=ScheduleRead,
    status_code=status.HTTP_200_OK,
    summary="Mark a schedule as viewed",
)
def view_schedule(
    schedule_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshop users can access this resource",
        )

    tenant_id = _resolve_workshop_tenant_id(current_user)
    service = ScheduleService(db)

    try:
        return service.view_schedule(schedule_id, tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch(
    "/{schedule_id}/accept",
    response_model=ScheduleRead,
    status_code=status.HTTP_200_OK,
    summary="Accept a schedule request",
)
def accept_schedule(
    schedule_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshop users can access this resource",
        )

    tenant_id = _resolve_workshop_tenant_id(current_user)
    service = ScheduleService(db)

    try:
        return service.accept_schedule(schedule_id, tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch(
    "/{schedule_id}/reject",
    response_model=ScheduleRead,
    status_code=status.HTTP_200_OK,
    summary="Reject a schedule request",
)
def reject_schedule(
    schedule_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshop users can access this resource",
        )

    tenant_id = _resolve_workshop_tenant_id(current_user)
    service = ScheduleService(db)

    try:
        return service.reject_schedule(schedule_id, tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
