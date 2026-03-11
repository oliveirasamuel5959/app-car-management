from sqlalchemy.orm import Session
from app.src.models.vehicle import Vehicle
from app.src.models.user import User
from app.src.schemas.vehicle import VehicleCreate

def repo_create_vehicle(db: Session, user_id, vehicle_data: VehicleCreate) -> Vehicle:
    
    vehicle = Vehicle(**vehicle_data, user_id=user_id)
    
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    return vehicle

def repo_get_vehicle_by_email(db: Session, email: str) -> Vehicle | None:
    return db.query(Vehicle).join(User).filter(User.email == email).all()

def repo_get_vehicle_by_id(db: Session, vehicle_id: int) -> Vehicle | None:
    return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()

def repo_get_vehicles_by_user_id(db: Session, user_id: int) -> list[Vehicle]:
    return db.query(Vehicle).filter(Vehicle.user_id == user_id).all()

def check_duplicate_plate(db: Session, plate) -> bool:
    return db.query(Vehicle).filter(Vehicle.plate == plate).first()
