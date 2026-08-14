from math import cos, radians
from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from src.models.services import Service
from src.models.user import User
from src.models.vehicle import Vehicle
from src.models.workshop import Workshop
from src.models.workshop_client import WorkshopClient


def repo_search_workshops(
    db: Session,
    tenant_id: UUID | str | None = None,
    name: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float = 10.0,
    skip: int = 0,
    limit: int = 50,
) -> list[Workshop]:
    """Search workshops with optional name and location filters, paginated."""
    query = db.query(Workshop)

    if tenant_id is not None:
        query = query.filter(Workshop.tenant_id == tenant_id)

    if name:
        query = query.filter(Workshop.name.ilike(f"%{name}%"))

    if lat is not None and lng is not None:
        lat_delta = radius_km / 111.0
        lng_delta = (
            radius_km / (111.0 * cos(radians(lat))) if lat != 0 else radius_km / 111.0
        )
        query = query.filter(
            Workshop.latitude.between(lat - lat_delta, lat + lat_delta),
            Workshop.longitude.between(lng - lng_delta, lng + lng_delta),
        )

    return query.offset(skip).limit(limit).all()


def repo_get_workshop_by_id_any_tenant(
    db: Session, workshop_id: int
) -> Workshop | None:
    """Get a workshop by ID without tenant scoping (for client discovery)."""
    return db.query(Workshop).filter(Workshop.id == workshop_id).first()


def repo_create_workshop(
    db: Session, tenant_id: UUID | str, user_id: int, workshop_data: dict
) -> Workshop:
    workshop = Workshop(
        tenant_id=tenant_id,
        user_id=user_id,
        name=workshop_data.get("name"),
        email=workshop_data.get("email"),
        description=workshop_data.get("description"),
        latitude=workshop_data.get("latitude"),
        longitude=workshop_data.get("longitude"),
        rating_avg=workshop_data.get("rating_avg", 0.0),
        phone=workshop_data.get("phone"),
        address=workshop_data.get("address"),
        city=workshop_data.get("city"),
        state=workshop_data.get("state"),
        opening_hours=workshop_data.get("opening_hours"),
        logo_url=workshop_data.get("logo_url"),
    )
    db.add(workshop)
    db.commit()
    db.refresh(workshop)
    return workshop


def repo_update_workshop(db: Session, workshop: Workshop, updates: dict) -> Workshop:
    """Apply a partial update to an already-resolved workshop row."""
    for field, value in updates.items():
        setattr(workshop, field, value)
    db.commit()
    db.refresh(workshop)
    return workshop


def repo_get_workshop_by_id(
    db: Session, workshop_id: int, tenant_id: UUID | str
) -> Workshop | None:
    """Get a workshop by its ID."""
    return (
        db.query(Workshop)
        .filter(Workshop.id == workshop_id, Workshop.tenant_id == tenant_id)
        .first()
    )


def repo_get_workshop_by_tenant_id(
    db: Session, tenant_id: UUID | str
) -> Workshop | None:
    """Get the single workshop row owned by a tenant (uq_workshops_tenant_id)."""
    return db.query(Workshop).filter(Workshop.tenant_id == tenant_id).first()


def repo_get_workshop_for_user(
    db: Session, user_id: int, tenant_id: UUID | str
) -> Workshop | None:
    """Resolve the current tenant's workshop, preferring a direct owner match.

    A tenant currently supports a single workshop row, while multiple workshop-role
    users may belong to that tenant. Prefer the creator/owner link when present,
    then fall back to the tenant's single workshop.
    """
    workshop = (
        db.query(Workshop)
        .filter(Workshop.user_id == user_id, Workshop.tenant_id == tenant_id)
        .first()
    )
    if workshop:
        return workshop

    return db.query(Workshop).filter(Workshop.tenant_id == tenant_id).first()


def repo_get_workshop_by_id_for_client(
    db: Session,
    workshop_id: int,
    user_id: int,
    user_email: str | None = None,
) -> Workshop | None:
    ownership_filters = [
        Vehicle.user_id == user_id,
        WorkshopClient.user_id == user_id,
    ]
    if user_email is not None:
        ownership_filters.append(WorkshopClient.email == user_email)

    return (
        db.query(Workshop)
        .join(Service, Service.workshop_id == Workshop.id)
        .outerjoin(Vehicle, Service.vehicle_id == Vehicle.id)
        .outerjoin(WorkshopClient, Service.workshop_client_id == WorkshopClient.id)
        .filter(Workshop.id == workshop_id)
        .filter(or_(*ownership_filters))
        .distinct()
        .first()
    )


def repo_get_workshop_all_clients(
    db: Session, workshop_id: int, tenant_id: UUID | str
) -> list[User]:
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
            Service.tenant_id == tenant_id,
            User.role == "CLIENT",
        )
        .distinct()
        .all()
    )


def repo_get_workshops_nearby(
    db: Session, tenant_id: UUID | str, lat: float, lng: float, radius_km: float = 10.0
) -> list[Workshop]:
    """Return workshops within a rough bounding box around the supplied coords.
    A more accurate Haversine or PostGIS query could be used later.
    """
    # approximate degree deltas for given radius
    lat_delta = radius_km / 111.0
    # handle longitude stretching by cosine of latitude
    lng_delta = (
        radius_km / (111.0 * cos(radians(lat))) if lat != 0 else radius_km / 111.0
    )

    return (
        db.query(Workshop)
        .filter(
            Workshop.tenant_id == tenant_id,
            Workshop.latitude.between(lat - lat_delta, lat + lat_delta),
            Workshop.longitude.between(lng - lng_delta, lng + lng_delta),
        )
        .all()
    )
