import datetime as _dt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.db.database import get_session
from src.schemas.schedules import ScheduleCreate, ScheduleRead
from src.services.schedules import ScheduleService
from src.services.workshop import WorkshopService

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


# ---------------------------------------------------------------------------
# List schedules (workshop or client view depending on role)
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=list[ScheduleRead],
    status_code=status.HTTP_200_OK,
    summary="List schedules for the current user",
)
def list_schedules(
    workshop_tenant_id: str = Query("me"),
    client_tenant_id: str = Query("me"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    role = current_user.get("role")
    service = ScheduleService(db)

    if role == "WORKSHOP":
        tenant_id = (
            current_user.get("tenant_id")
            if workshop_tenant_id == "me"
            else workshop_tenant_id
        )
        return service.get_schedules_for_workshop(tenant_id, skip=skip, limit=limit)

    if role == "CLIENT":
        tenant_id = (
            current_user.get("tenant_id")
            if client_tenant_id == "me"
            else client_tenant_id
        )
        return service.get_schedules_for_client(tenant_id, skip=skip, limit=limit)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Unknown role",
    )


# ---------------------------------------------------------------------------
# Create schedule (CLIENT only)
# ---------------------------------------------------------------------------


@router.post(
    "/",
    response_model=ScheduleRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new schedule request",
)
def create_schedule(
    schedule_in: ScheduleCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    _require_role(current_user, "CLIENT")

    # Resolve the target workshop to get its tenant_id and operating hours
    ws_service = WorkshopService(db)
    try:
        workshop = ws_service.get_workshop_by_id_any_tenant(schedule_in.workshop_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    # Validate scheduled_at is within workshop operating hours, if configured
    scheduled_time = schedule_in.scheduled_at.time() if schedule_in.scheduled_at else None
    if workshop.opening_time and workshop.closing_time and scheduled_time:
        if not (workshop.opening_time <= scheduled_time <= workshop.closing_time):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Scheduled time {scheduled_time.strftime('%H:%M')} is outside "
                    f"workshop operating hours ({workshop.opening_time.strftime('%H:%M')} – "
                    f"{workshop.closing_time.strftime('%H:%M')})"
                ),
            )

    # Validate scheduled_at weekday is in work_days, if configured
    if workshop.work_days and schedule_in.scheduled_at:
        iso_weekday = schedule_in.scheduled_at.isoweekday()
        work_days_set = {
            int(d.strip()) for d in workshop.work_days.split(",") if d.strip()
        }
        if work_days_set and iso_weekday not in work_days_set:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Workshop is closed on weekday {iso_weekday}",
            )

    service = ScheduleService(db)
    try:
        data = schedule_in.model_dump()
        data["workshop_tenant_id"] = workshop.tenant_id
        return service.create_schedule(data, current_user.get("tenant_id"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create schedule: {str(e)}",
        )


# ---------------------------------------------------------------------------
# Get single schedule
# ---------------------------------------------------------------------------


@router.get(
    "/{schedule_id}",
    response_model=ScheduleRead,
    status_code=status.HTTP_200_OK,
    summary="Get a single schedule by ID",
)
def get_schedule(
    schedule_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    role = current_user.get("role")
    service = ScheduleService(db)
    schedule = None

    if role == "WORKSHOP":
        schedule = service.get_schedule_by_id(
            schedule_id, current_user.get("tenant_id")
        )
    elif role == "CLIENT":
        schedule = service.get_schedule_by_id_for_client(
            schedule_id, current_user.get("tenant_id")
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Unknown role"
        )

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found"
        )

    return schedule


# ---------------------------------------------------------------------------
# Workshop-side actions
# ---------------------------------------------------------------------------


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
    _require_role(current_user, "WORKSHOP")
    service = ScheduleService(db)
    try:
        return service.view_schedule(schedule_id, current_user.get("tenant_id"))
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
    _require_role(current_user, "WORKSHOP")
    service = ScheduleService(db)
    try:
        return service.accept_schedule(schedule_id, current_user.get("tenant_id"))
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
    _require_role(current_user, "WORKSHOP")
    service = ScheduleService(db)
    try:
        return service.reject_schedule(schedule_id, current_user.get("tenant_id"))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
