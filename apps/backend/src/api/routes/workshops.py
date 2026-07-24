
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.core.file_uploader import handle_file_upload
from src.db.database import get_session
from src.schemas.user import UserRead
from src.schemas.workshop import WorkshopCreate, WorkshopRead, WorkshopUpdate
from src.services.workshop import WorkshopService

router = APIRouter()


@router.get(
    "/",
    response_model=list[WorkshopRead],
    status_code=status.HTTP_200_OK,
    summary="Get nearby workshops",
    description="Provide latitude and longitude query parameters to find nearby workshops.",
)
def get_nearby_workshops(
    lat: float,
    lng: float,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Returns a list of workshops roughly within a 10km radius of the coordinates."""
    service = WorkshopService(db)
    # simply forward to service, no further validation for now
    try:
        results = service.get_nearby_workshops(current_user.get("tenant_id"), lat, lng)
        return results
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch workshops",
        )


# optional endpoints for workshop owners to manage their profile
@router.post(
    "/",
    response_model=WorkshopRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create workshop profile",
    description="Workshop owners can create their workshop details",
)
def create_workshop(
    workshop_in: WorkshopCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = WorkshopService(db)
    try:
        user_id = current_user.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to determine authenticated user id",
            )
        return service.create_workshop(
            workshop_in, user_id=int(user_id), tenant_id=current_user.get("tenant_id")
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/me",
    response_model=WorkshopRead,
    status_code=status.HTTP_200_OK,
    summary="Get current workshop profile",
)
def get_current_workshop(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshop users can access this resource",
        )

    service = WorkshopService(db)
    try:
        return service.get_current_workshop(
            int(current_user.get("user_id")),
            current_user.get("tenant_id"),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put(
    "/me",
    response_model=WorkshopRead,
    status_code=status.HTTP_200_OK,
    summary="Update current workshop profile",
)
def update_current_workshop(
    updates: WorkshopUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshop users can access this resource",
        )

    service = WorkshopService(db)
    try:
        return service.update_workshop(
            int(current_user.get("user_id")),
            current_user.get("tenant_id"),
            updates,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/me/logo",
    response_model=WorkshopRead,
    status_code=status.HTTP_200_OK,
    summary="Upload the current workshop's logo",
)
async def upload_workshop_logo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshop users can access this resource",
        )

    file_info = await handle_file_upload(file, int(current_user.get("user_id")))
    service = WorkshopService(db)
    try:
        return service.update_workshop(
            int(current_user.get("user_id")),
            current_user.get("tenant_id"),
            WorkshopUpdate(logo_url=file_info["file_url"]),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


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
        if current_user.get("role") == "CLIENT":
            return service.get_workshop_by_client_access(
                workshop_id,
                int(current_user.get("user_id")),
                user_email=current_user.get("sub"),
            )
        return service.get_workshop_by_id(workshop_id, current_user.get("tenant_id"))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/{workshop_id}/clients",
    response_model=list[UserRead],
    status_code=status.HTTP_200_OK,
    summary="Get all clients of a workshop",
    description="Returns all distinct users with role CLIENT that have services in this workshop.",
)
def get_workshop_clients(
    workshop_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
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

        clients = service.get_all_clients(workshop_id, current_user.get("tenant_id"))
        return clients

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch workshop clients",
        )
