from sqlalchemy.orm import Session
from typing import List, Optional
from app.src.repositories.services import (
    repo_create_service,
    repo_get_service_by_id,
    repo_get_services_by_user_id,
    repo_get_services_by_workshop_id,
    repo_get_services_by_vehicle_id,
    repo_get_all_services,
    repo_update_service_by_current_workshop,
    repo_delete_service,
)
from app.src.repositories.workshop_client import repo_get_workshop_client_by_id
from app.src.repositories.vehicle import repo_get_vehicle_by_id, repo_get_vehicles_by_user_id, check_duplicate_plate
from app.src.models.workshop import Workshop
from app.src.schemas.services import ServiceCreate
from app.src.models.services import Service


class ServiceService:
    def __init__(self, db: Session):
        self.db = db

    def create_service(self, service_in: ServiceCreate, user_id: int) -> Service:
        """Create a new service with validation."""
        # Derive workshop from current user
        workshop = self.db.query(Workshop).filter(Workshop.user_id == user_id).first()
        client = repo_get_workshop_client_by_id(self.db, service_in.workshop_client_id)
        
        if not workshop:
            raise ValueError("No workshop found for current user")

        # Validate exactly one of vehicle_id or workshop_client_id
        if service_in.vehicle_id and service_in.workshop_client_id:
            raise ValueError("Provide either vehicle_id or workshop_client_id, not both")
        if not service_in.vehicle_id and not service_in.workshop_client_id:
            raise ValueError("Either vehicle_id or workshop_client_id must be provided")

        # Validate the referenced entity
        if service_in.workshop_client_id:
            if not client or client.workshop_id != workshop.id:
                raise ValueError("Workshop client not found or does not belong to your workshop")

        if service_in.vehicle_id:
            vehicle = repo_get_vehicle_by_id(self.db, service_in.vehicle_id)
            if not vehicle:
                raise ValueError(f"Vehicle with ID {service_in.vehicle_id} not found")

        # Validate status
        valid_statuses = ["pending", "approved", "in_progress", "waiting_parts", "completed", "cancelled"]
        if service_in.status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        # Validate progress_percentage
        if not (0 <= service_in.progress_percentage <= 100):
            raise ValueError("Progress percentage must be between 0 and 100")

        # Build service data with workshop_id
        service_data = service_in.dict()
        service_data["workshop_id"] = workshop.id

        # Derive vehicle_id from workshop client's plate
        if service_in.workshop_client_id and not service_in.vehicle_id:
            vehicle = check_duplicate_plate(self.db, client.vehicle_plate)
            if vehicle:
                service_data["vehicle_id"] = vehicle.id
        
        return repo_create_service(self.db, service_data=service_data)

    def get_service_by_id(self, service_id: int) -> Optional[Service]:
        """Get a service by ID."""
        return repo_get_service_by_id(self.db, service_id)

    def get_services_by_workshop_id(self, workshop_id: int) -> List[Service]:
        """Get all services for a workshop."""
        return repo_get_services_by_workshop_id(self.db, workshop_id)

    def get_services_by_vehicle_id(self, vehicle_id: int) -> List[Service]:
        """Get all services for a vehicle."""
        return repo_get_services_by_vehicle_id(self.db, vehicle_id)

    def get_services_by_user_id(self, user_id: int) -> List[Service]:
        """Get all services that belong to a specific user via vehicles."""
        return repo_get_services_by_user_id(self.db, user_id)

    def get_all_services(self) -> List[Service]:
        """Get all services."""
        return repo_get_all_services(self.db)

    def update_service_by_user_id(self, user_id: int, service_id: int, service_data: dict) -> Optional[Service]:
        """Update a service."""
        # Validate status if provided
        if "status" in service_data:
            valid_statuses = ["pending", "approved", "in_progress", "waiting_parts", "completed", "cancelled"]
            if service_data["status"] not in valid_statuses:
                raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        # Validate progress_percentage if provided
        if "progress_percentage" in service_data:
            if not (0 <= service_data["progress_percentage"] <= 100):
                raise ValueError("Progress percentage must be between 0 and 100")

        update_dict = service_data.model_dump(exclude_unset=True)

        return repo_update_service_by_current_workshop(self.db, user_id, service_id, update_dict)

    def delete_service(self, service_id: int) -> bool:
        """Delete a service."""
        return repo_delete_service(self.db, service_id)
