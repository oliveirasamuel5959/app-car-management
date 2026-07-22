
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.core.logger import get_logger
from src.db.database import get_session
from src.schemas.services_history import (
    ServiceHistoryCreate,
    ServiceHistoryRead,
    ServiceHistoryUpdate,
)
from src.services.services_history import (
    ServiceHistoryReadOnlyError,
    ServiceHistoryService,
)

logger = get_logger(__name__)

router = APIRouter()


@router.post(
    "/",
    response_model=ServiceHistoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new service order",
    description="Create a new service order for a workshop client",
)
def create_service_history(
    history_in: ServiceHistoryCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Create a new service history record with validation of workshop and client."""
    if current_user.get("role") != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can create service history records",
        )

    service = ServiceHistoryService(db)

    try:
        user_id = current_user.get("user_id")
        tenant_id = current_user.get("tenant_id")
        logger.info(
            f"Creating service history record for user_id={user_id}, tenant_id={tenant_id}"
        )
        return service.create_service_history(
            history_in, user_id=int(user_id), tenant_id=tenant_id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the service history record: {str(e)}",
        )


@router.get(
    "/",
    response_model=list[ServiceHistoryRead],
    status_code=status.HTTP_200_OK,
    summary="List service history records",
    description="List the authenticated client's vehicle service-history records, optionally filtered by service type or vehicle.",
)
def list_service_history(
    service_type: str | None = Query(None),
    vehicle_id: int | None = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can access service history records",
        )

    service = ServiceHistoryService(db)
    return service.get_services_history(
        tenant_id=current_user.get("tenant_id"),
        user_id=int(current_user.get("user_id")),
        service_type=service_type,
        vehicle_id=vehicle_id,
    )


@router.get(
    "/workshop",
    response_model=list[ServiceHistoryRead],
    status_code=status.HTTP_200_OK,
    summary="List service history records authored by the workshop",
    description="List the authenticated workshop's own service-history records (created via completed service orders), optionally filtered by service type or vehicle.",
)
def list_service_history_for_workshop(
    service_type: str | None = Query(None),
    vehicle_id: int | None = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshops can access this resource",
        )

    service = ServiceHistoryService(db)
    return service.get_services_history_for_workshop(
        tenant_id=current_user.get("tenant_id"),
        user_id=int(current_user.get("user_id")),
        service_type=service_type,
        vehicle_id=vehicle_id,
    )


@router.get(
    "/{history_id}",
    response_model=ServiceHistoryRead,
    status_code=status.HTTP_200_OK,
    summary="Get a single service history record",
)
def get_service_history(
    history_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can access service history records",
        )

    service = ServiceHistoryService(db)
    result = service.get_service_history_by_id(
        history_id=history_id,
        tenant_id=current_user.get("tenant_id"),
        user_id=int(current_user.get("user_id")),
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service history record not found",
        )

    return result


@router.put(
    "/{history_id}",
    response_model=ServiceHistoryRead,
    status_code=status.HTTP_200_OK,
    summary="Update a service history record",
)
def update_service_history(
    history_id: int,
    history_in: ServiceHistoryUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can update service history records",
        )

    service = ServiceHistoryService(db)
    try:
        result = service.update_service_history(
            history_id=history_id,
            history_in=history_in,
            tenant_id=current_user.get("tenant_id"),
            user_id=int(current_user.get("user_id")),
        )
    except ServiceHistoryReadOnlyError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service history record not found",
        )

    return result


@router.delete(
    "/{history_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a service history record",
)
def delete_service_history(
    history_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can delete service history records",
        )

    service = ServiceHistoryService(db)
    try:
        deleted = service.delete_service_history(
            history_id=history_id,
            tenant_id=current_user.get("tenant_id"),
            user_id=int(current_user.get("user_id")),
        )
    except ServiceHistoryReadOnlyError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service history record not found",
        )

    return None
