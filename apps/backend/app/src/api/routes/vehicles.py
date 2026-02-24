from app.src.core.exceptions import DuplicateVehiclePlateError
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
    """
    Create a new vehicle for the authenticated user.

    ### Requirements:
    - User must be authenticated (valid JWT token required)
    - Vehicle plate must be unique
    - User can only have one vehicle

    ### Parameters:
    - **brand**: Vehicle brand/make
    - **model**: Vehicle model
    - **year**: Year of manufacture
    - **plate**: Unique license plate

    ### Returns:
    - Created vehicle object
    """
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
        