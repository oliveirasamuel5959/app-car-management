from app.src.repositories.user import get_user_by_email
from app.src.repositories.vehicle import repo_create_vehicle
from app.src.schemas.vehicle import VehicleCreate
from app.src.repositories.vehicle import get_vehicle_by_user_id

class VehicleService:
  def __init__(self, db):
    self.db = db

  def create_vehicle(self, vehicle_in: VehicleCreate):
    user = get_user_by_email(self.db, vehicle_in.user.email)
    vehicle = get_vehicle_by_user_id(self.db, user.id)
    
    if not user:
      raise ValueError("User not found")
    
    if vehicle:
      raise ValueError("User already has a vehicle")
    
    vehicle = repo_create_vehicle(self.db, user_id=user.id, vehicle_data=vehicle_in.dict(exclude={"user"}))
    return vehicle
  