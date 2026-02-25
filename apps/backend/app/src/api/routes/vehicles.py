from app.src.core.exceptions import DuplicateVehiclePlateError
from app.src.schemas import vehicle
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.src.db.database import get_session
from app.src.schemas.vehicle import VehicleRead, VehicleCreate
from app.src.services.vehicle import VehicleService
from app.src.core.auth import get_current_user

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

        # Create VehicleCreate with authenticated user's email
        vehicle_data = VehicleCreate(
            brand=vehicle_create.brand,
            model=vehicle_create.model,
            year=vehicle_create.year,
            plate=vehicle_create.plate,
            user=vehicle_create.user
        )

        return vehicle_service.create_vehicle(vehicle_data)
      
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
    response_model=VehicleRead,
    status_code=status.HTTP_200_OK,
    summary="Get user's vehicle",
    description="Get the vehicle associated with the authenticated user"
)
def get_vehicle(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Get the vehicle associated with the authenticated user.

    ### Requirements:
    - User must be authenticated (valid JWT token required)

    ### Returns:
    - Vehicle object associated with the user, or null if no vehicle exists
    """
    vehicle_service = VehicleService(db)

    try:
      user_email = current_user.get("sub")
      res = vehicle_service.get_vehicle_by_email(user_email)
      
      print("Vehicle service response:", res)  # Debug log
      
      if res is None:
          raise HTTPException(
              status_code=status.HTTP_404_NOT_FOUND,
              detail="No vehicle found for the user"
          )
          
      return res
      
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving the vehicle"
        ) 
        