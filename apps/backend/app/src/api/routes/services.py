from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.src.db.database import get_session
from app.src.schemas.services import ServiceRead, ServiceCreate, ServiceUpdate
from app.src.services.services import ServiceService
from app.src.core.auth import get_current_user

router = APIRouter()


@router.post(
    "/",
    response_model=ServiceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new service",
    description="Create a new service record in the workshop"
)
def create_service(
    service_in: ServiceCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Create a new service with validation of workshop and vehicle."""
    service = ServiceService(db)
    
    try:
        user_id = current_user.get("user_id")
        return service.create_service(service_in, user_id=int(user_id))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the service"
        )


@router.get(
    "/",
    response_model=List[ServiceRead],
    status_code=status.HTTP_200_OK,
    summary="Get services",
    description="Get services with optional filtering by workshop_id or vehicle_id"
)
def get_services(
    workshop_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    workshop_client_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get services with optional filters."""
    service = ServiceService(db)
    
    try:
        if workshop_client_id is not None:
            return service.get_services_by_workshop_client_id(workshop_client_id)
        elif workshop_id is not None:
            return service.get_services_by_workshop_id(workshop_id)
        elif vehicle_id is not None:
            return service.get_services_by_vehicle_id(vehicle_id)
        else:
            return service.get_all_services()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch services"
        )


@router.get(
    "/my",
    response_model=List[ServiceRead],
    status_code=status.HTTP_200_OK,
    summary="Get services of current user",
    description="Get all services that belong to the authenticated user"
)
def get_my_services(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get all services that belong to the logged-in user."""
    service = ServiceService(db)

    try:
        user_id = current_user.get("user_id")
        result = service.get_services_by_user_id(user_id)
        return result

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch services"
        )


@router.put("/my/{service_id}")
def update_my_service(
    service_id: int,
    service_update: ServiceUpdate,
    db: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    service_service = ServiceService(db)
    
    user_id = current_user.get("user_id")

    updated_service = service_service.update_service_by_user_id(
        user_id=user_id,
        service_id=service_id,
        service_data=service_update
    )

    if not updated_service:
        raise HTTPException(status_code=404, detail="Service not found")

    return updated_service

@router.get(
    "/{service_id}",
    response_model=ServiceRead,
    status_code=status.HTTP_200_OK,
    summary="Get service by ID",
    description="Get a specific service by its ID"
)
def get_service(
    service_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get a specific service by ID."""
    service = ServiceService(db)
    
    try:
        result = service.get_service_by_id(service_id)
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service with ID {service_id} not found"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch service"
        )
        
