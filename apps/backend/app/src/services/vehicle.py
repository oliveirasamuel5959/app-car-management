from sqlalchemy.exc import IntegrityError
from app.src.repositories.user import get_user_by_email
from app.src.repositories.vehicle import repo_create_vehicle
from app.src.schemas.vehicle import VehicleCreate
from app.src.repositories.vehicle import get_vehicle_by_user_id
from app.src.core.exceptions import DuplicateVehiclePlateError
from app.src.repositories.vehicle import check_duplicate_plate
class VehicleService:
  def __init__(self, db):
    self.db = db

  def create_vehicle(self, vehicle_in: VehicleCreate):
    user = get_user_by_email(self.db, vehicle_in.user.email)
    
    if not user:
      raise ValueError("User not found")
    
    vehicle = get_vehicle_by_user_id(self.db, user.id)
    
    duplicate_plate = check_duplicate_plate(self.db, vehicle_in.plate)

    if duplicate_plate is not None:
      raise DuplicateVehiclePlateError()

    if vehicle:
      raise ValueError("User already has a vehicle")
    
    try:
      return repo_create_vehicle(self.db, user_id=user.id, vehicle_data=vehicle_in.dict(exclude={"user"}))
    except IntegrityError:
      self.db.rollback()
      raise DuplicateVehiclePlateError()
  