from uuid import UUID

from sqlalchemy.orm import Session

from src.models.user import User
from src.models.vehicle import Vehicle


def repo_create_vehicle(
    db: Session, tenant_id: UUID | str, user_id: int, vehicle_data: dict
) -> Vehicle:
    vehicle = Vehicle(**vehicle_data, tenant_id=tenant_id, user_id=user_id)

    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)

    return vehicle


def repo_get_vehicle_by_email(
    db: Session, email: str, tenant_id: UUID | str
) -> list[Vehicle]:
    return (
        db.query(Vehicle)
        .join(User)
        .filter(User.email == email, Vehicle.tenant_id == tenant_id)
        .all()
    )


def repo_get_vehicle_by_id(
    db: Session, vehicle_id: int, tenant_id: UUID | str
) -> Vehicle | None:
    return (
        db.query(Vehicle)
        .filter(Vehicle.id == vehicle_id, Vehicle.tenant_id == tenant_id)
        .first()
    )


def repo_get_vehicles_by_user_id(
    db: Session, user_id: int, tenant_id: UUID | str
) -> list[Vehicle]:
    """List a user's vehicles, scoped to the user's tenant."""
    if not tenant_id:
        raise TypeError("tenant_id is required")

    return (
        db.query(Vehicle)
        .filter(Vehicle.user_id == user_id, Vehicle.tenant_id == tenant_id)
        .all()
    )


def repo_get_vehicles_by_user_id_any_tenant(
    db: Session, user_id: int
) -> list[Vehicle]:
    """List a user's vehicles regardless of tenant.

    A workshop holds a `WorkshopClient` in its own tenant, but the vehicle
    belongs to the linked client, whose vehicles live in the client's tenant.
    Resolving through the workshop's tenant therefore never matches.
    """
    if not user_id:
        return []

    return db.query(Vehicle).filter(Vehicle.user_id == user_id).all()


def check_duplicate_plate(
    db: Session, tenant_id: UUID | str, plate: str
) -> Vehicle | None:
    return (
        db.query(Vehicle)
        .filter(Vehicle.plate == plate, Vehicle.tenant_id == tenant_id)
        .first()
    )
