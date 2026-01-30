from app.src.core.exceptions import DuplicateVehiclePlateError
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.src.db.database import get_session
from app.src.schemas.vehicle import VehicleRead, VehicleCreate
from app.src.services.vehicle import VehicleService

router = APIRouter()

@router.post(
  "/", 
  response_model=VehicleRead, 
  status_code=status.HTTP_201_CREATED
)
def create_vehicle(vehicle_create: VehicleCreate, db: Session = Depends(get_session)):
  vehicle_service = VehicleService(db)
  
  try:
    return vehicle_service.create_vehicle(vehicle_create)
  except DuplicateVehiclePlateError as e:
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT, 
      detail="Vehicle with this plate already exists"
    )
  