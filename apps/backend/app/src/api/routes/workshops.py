from app.src.schemas.user import UserRead
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.src.db.database import get_session
from app.src.schemas.workshop import WorkshopRead, WorkshopCreate
from app.src.services.workshop import WorkshopService
from app.src.core.auth import get_current_user, get_user_by_role

router = APIRouter()


@router.get(
    "/",
    response_model=list[WorkshopRead],
    status_code=status.HTTP_200_OK,
    summary="Get nearby workshops",
    description="Provide latitude and longitude query parameters to find nearby workshops."
)
def get_nearby_workshops(
    lat: float,
    lng: float,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Returns a list of workshops roughly within a 10km radius of the coordinates."""
    service = WorkshopService(db)
    # simply forward to service, no further validation for now
    try:
        results = service.get_nearby_workshops(lat, lng)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch workshops"
        )


# optional endpoints for workshop owners to manage their profile
@router.post(
    "/",
    response_model=WorkshopRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create workshop profile",
    description="Workshop owners can create their workshop details"
)
def create_workshop(
    workshop_in: WorkshopCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    service = WorkshopService(db)
    try:
        user_id = current_user.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to determine authenticated user id"
            )
        return service.create_workshop(workshop_in, user_id=int(user_id))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get(
    "/{workshop_id}",
    response_model=WorkshopRead,
    status_code=status.HTTP_200_OK,
    summary="Get workshop by ID",
)
def get_workshop_by_id(
    workshop_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = WorkshopService(db)
    try:
        return service.get_workshop_by_id(workshop_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{workshop_id}/clients",
    response_model=list[UserRead],
    status_code=status.HTTP_200_OK,
    summary="Get all clients of a workshop",
    description="Returns all distinct users with role CLIENT that have services in this workshop."
)
def get_workshop_clients(
    workshop_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    service = WorkshopService(db)

    try:
        # # Optional: restrict access to workshop role
        # print("Current user role:", current_user.get("role"))
        # if current_user.get("role") != "WORKSHOP":
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="Only workshop users can access this resource"
        #     )

        clients = service.get_all_clients(workshop_id)
        return clients

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch workshop clients"
        )