from app.src.models.user import User
from app.src.models.vehicle import Vehicle
from app.src.models.services import Service
from sqlalchemy.orm import Session
from typing import List
from math import radians, cos

from app.src.models.workshop import Workshop


def repo_create_workshop(db: Session, user_id: int, workshop_data: dict) -> Workshop:
    workshop = Workshop(**workshop_data)
    db.add(workshop)
    db.commit()
    db.refresh(workshop)
    return workshop


def repo_get_workshop_by_id(db: Session, workshop_id: int) -> Workshop | None:
    """Get a workshop by its ID."""
    return db.query(Workshop).filter(Workshop.id == workshop_id).first()


def repo_get_workshop_all_clients(db: Session, workshop_id: int) -> List[User]:
    """
    Return all distinct users with role 'client'
    that have services in a given workshop.
    """

    return (
        db.query(User)
        .join(Vehicle, Vehicle.user_id == User.id)
        .join(Service, Service.vehicle_id == Vehicle.id)
        .filter(
            Service.workshop_id == workshop_id,
            User.role == "CLIENT"
        )
        .distinct()
        .all()
    )

def repo_get_workshops_nearby(
    db: Session,
    lat: float,
    lng: float,
    radius_km: float = 10.0
) -> List[Workshop]:
    """Return workshops within a rough bounding box around the supplied coords.
    A more accurate Haversine or PostGIS query could be used later.
    """
    # approximate degree deltas for given radius
    lat_delta = radius_km / 111.0
    # handle longitude stretching by cosine of latitude
    lng_delta = radius_km / (111.0 * cos(radians(lat))) if lat != 0 else radius_km / 111.0

    return (
        db.query(Workshop)
        .filter(
            Workshop.latitude.between(lat - lat_delta, lat + lat_delta),
            Workshop.longitude.between(lng - lng_delta, lng + lng_delta),
        )
        .all()
    )
