from sqlalchemy.orm import Session
from typing import List, Optional
from app.src.repositories.services import (
    repo_create_service,
    repo_get_service_by_id,
    repo_get_services_by_user_id,
    repo_get_services_by_workshop_id,
    repo_get_services_by_vehicle_id,
    repo_get_services_by_workshop_client_id,
    repo_get_all_services,
    repo_update_service_by_current_workshop,
    repo_delete_service,
)
from app.src.repositories.workshop_client import repo_get_workshop_client_by_id
from app.src.repositories.vehicle import repo_get_vehicle_by_id, repo_get_vehicles_by_user_id, check_duplicate_plate
from app.src.models.workshop import Workshop
from app.src.schemas.services import ServiceCreate
from app.src.models.services import Service
from app.src.services.notifications import NotificationService


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

    def get_services_by_workshop_client_id(self, workshop_client_id: int) -> List[Service]:
        """Get all services for a workshop client."""
        return repo_get_services_by_workshop_client_id(self.db, workshop_client_id)

    def get_services_by_user_id(self, user_id: int) -> List[Service]:
        """Get all services that belong to a specific user via vehicles."""
        return repo_get_services_by_user_id(self.db, user_id)

    def get_all_services(self) -> List[Service]:
        """Get all services."""
        return repo_get_all_services(self.db)

    def update_service_by_user_id(self, user_id: int, service_id: int, service_data: dict) -> Optional[Service]:
        """Update a service."""
        # Get the current service to compare status
        current_service = repo_get_service_by_id(self.db, service_id)
        if not current_service:
            return None

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
        print(f"[DEBUG] Updating service {service_id}: {update_dict}")

        # Update the service
        updated_service = repo_update_service_by_current_workshop(self.db, user_id, service_id, update_dict)

        # Create notification if status changed
        if updated_service and "status" in update_dict and update_dict["status"] != current_service.status:
            print(f"[DEBUG] Status changed from {current_service.status} to {update_dict['status']}")
            try:
                notification_service = NotificationService(self.db)

                # Notify the workshop client user if they have a user account
                if updated_service.workshop_client_id:
                    print(f"[DEBUG] Service has workshop_client_id: {updated_service.workshop_client_id}")
                    workshop_client = repo_get_workshop_client_by_id(self.db, updated_service.workshop_client_id)
                    if workshop_client and workshop_client.user_id:
                        print(f"[DEBUG] Creating notification for workshop client user {workshop_client.user_id}")
                        notification_service.create_status_change_notification(
                            user_id=workshop_client.user_id,
                            service_name=updated_service.name,
                            old_status=current_service.status,
                            new_status=update_dict["status"],
                            service_id=service_id,
                        )
                    else:
                        print(f"[DEBUG] Workshop client not found or has no user_id")

                # Notify the vehicle owner if they have a user account
                if updated_service.vehicle_id:
                    print(f"[DEBUG] Service has vehicle_id: {updated_service.vehicle_id}")
                    vehicle = repo_get_vehicle_by_id(self.db, updated_service.vehicle_id)
                    if vehicle and vehicle.user_id:
                        print(f"[DEBUG] Creating notification for vehicle owner user {vehicle.user_id}")
                        notification_service.create_status_change_notification(
                            user_id=vehicle.user_id,
                            service_name=updated_service.name,
                            old_status=current_service.status,
                            new_status=update_dict["status"],
                            service_id=service_id,
                        )
                    else:
                        print(f"[DEBUG] Vehicle not found or has no user_id")
            except Exception as e:
                print(f"[ERROR] Error creating notification: {e}")
                import traceback
                traceback.print_exc()
        else:
            if not updated_service:
                print(f"[DEBUG] Service not updated")
            elif "status" not in update_dict:
                print(f"[DEBUG] Status not in update_dict")
            else:
                print(f"[DEBUG] Status not changed: {current_service.status} == {update_dict['status']}")

        return updated_service

    def delete_service(self, service_id: int) -> bool:
        """Delete a service."""
        return repo_delete_service(self.db, service_id)
