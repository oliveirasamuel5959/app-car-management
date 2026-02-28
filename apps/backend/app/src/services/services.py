from sqlalchemy.orm import Session
from typing import List, Optional
from app.src.repositories.services import (
    repo_create_service,
    repo_get_service_by_id,
    repo_get_services_by_user_id,
    repo_get_services_by_workshop_id,
    repo_get_services_by_vehicle_id,
    repo_get_all_services,
    repo_update_service,
    repo_delete_service,
)
from app.src.repositories.workshop import repo_get_workshop_by_id
from app.src.repositories.vehicle import repo_get_vehicle_by_id
from app.src.schemas.services import ServiceCreate
from app.src.models.services import Service


class ServiceService:
    def __init__(self, db: Session):
        self.db = db

    def create_service(self, service_in: ServiceCreate) -> Service:
        """Create a new service with validation."""
        # Validate that workshop exists
        workshop = repo_get_workshop_by_id(self.db, service_in.workshop_id)
        if not workshop:
            raise ValueError(f"Workshop with ID {service_in.workshop_id} not found")
        
        # Validate that vehicle exists
        vehicle = repo_get_vehicle_by_id(self.db, service_in.vehicle_id)
        if not vehicle:
            raise ValueError(f"Vehicle with ID {service_in.vehicle_id} not found")
        
        # Validate status is valid
        valid_statuses = ["pending", "approved", "in_progress", "waiting_parts", "completed", "cancelled"]
        if service_in.status not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        # Validate progress_percentage is between 0 and 100
        if not (0 <= service_in.progress_percentage <= 100):
            raise ValueError("Progress percentage must be between 0 and 100")
        
        # Create the service
        return repo_create_service(self.db, service_in.dict())

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

    def update_service(self, service_id: int, service_data: dict) -> Optional[Service]:
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
        
        return repo_update_service(self.db, service_id, service_data)

    def delete_service(self, service_id: int) -> bool:
        """Delete a service."""
        return repo_delete_service(self.db, service_id)
