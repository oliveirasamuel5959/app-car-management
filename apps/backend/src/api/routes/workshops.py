from fastapi import (APIRouter, Depends, File, HTTPException, Query,
                     UploadFile, status)
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.core.file_uploader import handle_file_upload
from src.db.database import get_session
from src.schemas.user import UserRead
from src.schemas.workshop import (WorkshopAgenda, WorkshopCreate, WorkshopRead,
                                  WorkshopSearchItem, WorkshopUpdate)
from src.services.workshop import WorkshopService

router = APIRouter()


@router.get(
    "/",
    response_model=list[WorkshopSearchItem],
    status_code=status.HTTP_200_OK,
    summary="Search workshops",
    description=(
        "Search workshops by name, location, minimum rating, offered service "
        "types, or a combination. Sorted (distance | rating | reviews) and "
        "paginated with skip/limit."
    ),
)
def search_workshops(
    name: str | None = Query(None, description="Case-insensitive name filter"),
    lat: float | None = Query(None, description="Latitude for location search"),
    lng: float | None = Query(None, description="Longitude for location search"),
    radius_km: float = Query(10.0, ge=0, le=100, description="Search radius in km"),
    min_rating: float | None = Query(
        None, ge=0, le=5, description="Minimum average rating"
    ),
    service_types: str | None = Query(
        None,
        description="CSV of offered service types: manutencao,reparo,inspecao,outro",
    ),
    sort: str | None = Query(
        None,
        description="Sort order: distance (needs lat/lng), rating, or reviews",
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Returns a paginated list of workshops with distance, offered types, and ratings count."""
    service = WorkshopService(db)
    try:
        results = service.search_workshops(
            name=name,
            lat=lat,
            lng=lng,
            radius_km=radius_km,
            min_rating=min_rating,
            service_types=service_types.split(",") if service_types else None,
            sort=sort,
            skip=skip,
            limit=limit,
        )
        return results
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
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
    "/{workshop_id}/agenda",
    response_model=WorkshopAgenda,
    status_code=status.HTTP_200_OK,
    summary="Get workshop availability agenda",
    description="Returns daily time slots with busy/free status for a date range.",
)
def get_workshop_agenda(
    workshop_id: int,
    date_from: str = Query(..., description="Start date YYYY-MM-DD"),
    date_to: str = Query(..., description="End date YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    import datetime as _dt

    try:
        d_from = _dt.date.fromisoformat(date_from)
        d_to = _dt.date.fromisoformat(date_to)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from and date_to must be YYYY-MM-DD",
        )

    if d_from > d_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from must be <= date_to",
        )

    service = WorkshopService(db)
    try:
        days = service.get_workshop_agenda(workshop_id, d_from, d_to)
        return WorkshopAgenda(days=days)
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
