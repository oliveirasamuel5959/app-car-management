from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Request
from sqlalchemy.orm import Session
from src.core.exceptions import DuplicateVehiclePlateError
from src.schemas import vehicle
from src.db.database import get_session
from src.schemas.vehicle import VehicleRead, VehicleCreate
from src.services.vehicle import VehicleService
from src.core.auth import get_current_user

router = APIRouter()

@router.post(
    "/",
    response_model=VehicleRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new vehicle",
    description="Create a new vehicle for the authenticated user"
)
def create_vehicle(
    vehicle_create: VehicleCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    vehicle_service = VehicleService(db)

    try:
        # Use authenticated user's email instead of from request body
        user_email = current_user.get("sub")
        user_id = current_user.get("user_id")
        tenant_id = current_user.get("tenant_id")
        
        print(f"Authenticated user ID: {user_id}, email: {user_email}")

        return vehicle_service.create_vehicle(vehicle_create, user_id=user_id, tenant_id=tenant_id)
      
    except DuplicateVehiclePlateError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle with this plate already exists"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the vehicle"
        )
        
@router.get(
    "/",
    response_model=list[VehicleRead],
    status_code=status.HTTP_200_OK,
    summary="Get user's vehicle",
    description="Get the vehicle associated with the authenticated user"
)
def get_vehicle(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    vehicle_service = VehicleService(db)

    user_email = current_user.get("sub")
    tenant_id = current_user.get("tenant_id")

    res = vehicle_service.get_vehicle_by_email(user_email, tenant_id)

    if res is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No vehicle found for the user"
        )

    return res
        
