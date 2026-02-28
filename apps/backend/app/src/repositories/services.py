from app.src.models.vehicle import Vehicle
from sqlalchemy.orm import Session
from typing import List, Optional
from app.src.models.services import Service
from app.src.schemas.services import ServiceCreate


def repo_create_service(db: Session, service_data: dict) -> Service:
    """Create a new service in the database."""
    service = Service(**service_data)
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


def repo_get_service_by_id(db: Session, service_id: int) -> Optional[Service]:
    """Get a service by its ID."""
    return db.query(Service).filter(Service.id == service_id).first()


def repo_get_services_by_workshop_id(db: Session, workshop_id: int) -> List[Service]:
    """Get all services for a specific workshop."""
    return db.query(Service).filter(Service.workshop_id == workshop_id).all()


def repo_get_services_by_vehicle_id(db: Session, vehicle_id: int) -> List[Service]:
    """Get all services for a specific vehicle."""
    return db.query(Service).filter(Service.vehicle_id == vehicle_id).all()


def repo_get_services_by_user_id(db: Session, user_id: int) -> List[Service]:
    """Get all services that belong to a specific user via vehicles."""
    return (
        db.query(Service)
        .join(Vehicle, Service.vehicle_id == Vehicle.id)
        .filter(Vehicle.user_id == user_id)
        .all()
    )


def repo_get_all_services(db: Session) -> List[Service]:
    """Get all services."""
    return db.query(Service).all()

def repo_update_service_by_user_id(
    db: Session,
    user_id: int,
    service_id: int,
    update_data: dict
) -> Optional[Service]:
    """
    Update a service only if it belongs to the user via vehicle.
    """

    service = (
        db.query(Service)
        .join(Vehicle, Service.vehicle_id == Vehicle.id)
        .filter(
            Service.id == service_id,
            Vehicle.user_id == user_id
        )
        .first()
    )
    
    print(f"Found service: {service}, for user_id: {user_id} and service_id: {service_id}")

    if not service:
        return None

    for field, value in update_data.items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)

    return service


def repo_delete_service(db: Session, service_id: int) -> bool:
    """Delete a service."""
    service = repo_get_service_by_id(db, service_id)
    if not service:
        return False
    
    db.delete(service)
    db.commit()
    return True
