from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.db.database import get_session
from src.schemas.workshop_service import (WorkshopServiceRead,
                                          WorkshopServicesUpdate)
from src.services.workshop_service import WorkshopServiceService

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
# List my workshop's offered service types (WORKSHOP)
# ---------------------------------------------------------------------------


@router.get(
    "/me",
    response_model=list[WorkshopServiceRead],
    status_code=status.HTTP_200_OK,
    summary="List my workshop's offered service types",
)
def list_my_workshop_services(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    _require_role(current_user, "WORKSHOP")
    service = WorkshopServiceService(db)
    try:
        return service.get_my_services(
            int(current_user.get("user_id")), current_user.get("tenant_id")
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ---------------------------------------------------------------------------
# Replace my workshop's offered service types (WORKSHOP, bulk replace)
# ---------------------------------------------------------------------------


@router.put(
    "/me",
    response_model=list[WorkshopServiceRead],
    status_code=status.HTTP_200_OK,
    summary="Replace my workshop's offered service types",
)
def replace_my_workshop_services(
    payload: WorkshopServicesUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    _require_role(current_user, "WORKSHOP")
    service = WorkshopServiceService(db)
    try:
        return service.set_my_services(
            int(current_user.get("user_id")),
            current_user.get("tenant_id"),
            [t.value for t in payload.service_types],
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
