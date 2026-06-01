from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from sqlalchemy import and_, or_

from src.models.vehicle import Vehicle
from src.models.workshop import Workshop
from src.repositories.workshop import repo_get_workshop_for_user
from src.models.workshop_client import WorkshopClient
from src.models import User
from src.models.services import Service
from src.models.vehicle import Vehicle


def repo_create_service(db: Session, tenant_id: UUID | str, service_data: dict) -> Service:
    """ Create a new service in the database. """
    service = Service(**service_data, tenant_id=tenant_id)
    db.add(service)
    db.commit()
    db.refresh(service)
    
    return service


def repo_get_service_by_id(db: Session, service_id: int, tenant_id: UUID | str) -> Optional[Service]:
    """Get a service by its ID."""
    return db.query(Service).filter(Service.id == service_id, Service.tenant_id == tenant_id).first()


def repo_get_services_by_workshop_id(db: Session, workshop_id: int, tenant_id: UUID | str) -> List[Service]:
    """Get all services for a specific workshop."""
    return db.query(Service).filter(Service.workshop_id == workshop_id, Service.tenant_id == tenant_id).all()


def repo_get_services_by_vehicle_id(db: Session, vehicle_id: int, tenant_id: UUID | str) -> List[Service]:
    """Get all services for a specific vehicle."""
    return db.query(Service).filter(Service.vehicle_id == vehicle_id, Service.tenant_id == tenant_id).all()


def repo_get_services_by_user_id(
    db: Session,
    user_id: int,
    tenant_id: UUID | str | None,
    user_email: str | None = None,
) -> List[Service]:
    """Get all services visible to a specific client via vehicles or linked workshop clients."""
    ownership_filters = [
        Vehicle.user_id == user_id,
        WorkshopClient.user_id == user_id,
    ]
    if user_email is not None:
        ownership_filters.append(WorkshopClient.email == user_email)

    query = (
        db.query(Service)
        .outerjoin(Vehicle, Service.vehicle_id == Vehicle.id)
        .outerjoin(WorkshopClient, Service.workshop_client_id == WorkshopClient.id)
        .filter(or_(*ownership_filters))
        .distinct()
    )

    if tenant_id is not None:
        query = query.filter(Service.tenant_id == tenant_id)

    return query.all()


def repo_get_service_by_user_id(
    db: Session,
    service_id: int,
    user_id: int,
    tenant_id: UUID | str | None,
    user_email: str | None = None,
) -> Optional[Service]:
    ownership_filters = [
        Vehicle.user_id == user_id,
        WorkshopClient.user_id == user_id,
    ]
    if user_email is not None:
        ownership_filters.append(WorkshopClient.email == user_email)

    query = (
        db.query(Service)
        .outerjoin(Vehicle, Service.vehicle_id == Vehicle.id)
        .outerjoin(WorkshopClient, Service.workshop_client_id == WorkshopClient.id)
        .filter(Service.id == service_id)
        .filter(or_(*ownership_filters))
        .distinct()
    )

    if tenant_id is not None:
        query = query.filter(Service.tenant_id == tenant_id)

    return query.first()

def repo_get_services_by_workshop_client_id(db: Session, workshop_client_id: int, tenant_id: UUID | str) -> List[Service]:
    """Get all services for a specific workshop client."""
    return db.query(Service).filter(Service.workshop_client_id == workshop_client_id, Service.tenant_id == tenant_id).all()

def repo_get_all_services(db: Session, tenant_id: UUID | str) -> List[Service]:
    """Get all services."""
    return db.query(Service).filter(Service.tenant_id == tenant_id).all()

def repo_update_service_by_current_workshop(
    db: Session,
    tenant_id: UUID | str,
    user_id: int,        # currently logged-in user
    service_id: int,
    update_data: dict
) -> Optional[Service]:
    """
    Update a service only if it belongs to the workshop
    of the current logged-in user.
    """

    # Get the workshop linked to this user
    workshop = repo_get_workshop_for_user(db, user_id, tenant_id)
    if not workshop:
        print(f"No workshop found for user_id: {user_id}")
        return None

    # Get the service that belongs to this workshop
    service = (
        db.query(Service)
        .filter(
            Service.id == service_id,
            Service.tenant_id == tenant_id,
            Service.workshop_id == workshop.id
        )
        .first()
    )

    print(f"Found service: {service}, for workshop_id: {workshop.id} and service_id: {service_id}")

    if not service:
        return None

    # Update the fields
    for field, value in update_data.items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)

    return service


def repo_delete_service(db: Session, service_id: int, tenant_id: UUID | str) -> bool:
    """Delete a service."""
    service = repo_get_service_by_id(db, service_id, tenant_id)
    if not service:
        return False
    
    db.delete(service)
    db.commit()
    return True
