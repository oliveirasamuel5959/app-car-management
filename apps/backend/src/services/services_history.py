<<<<<<< HEAD
import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from src.core.logger import get_logger
from src.models import Workshop, WorkshopClient
from src.models.services_history import ServiceHistory
from src.repositories.services_history import (
    repo_create_service_history, repo_delete_service_history,
    repo_get_service_history_by_id, repo_get_services_history_for_user,
    repo_update_service_history)
from src.schemas.services_history import (ServiceHistoryCreate,
                                          ServiceHistoryRead,
                                          ServiceHistoryUpdate)
from src.utils.services_history import (calculate_next_service_date,
                                        calculate_next_service_mileage)

logger = get_logger(__name__)


class ServiceHistoryService:
    def __init__(self, db: Session):
        self.db = db

    def create_service_history(
        self, history_in: ServiceHistoryCreate, user_id: int, tenant_id: uuid.UUID
    ) -> ServiceHistoryRead:
        # Create service history record
        logger.info(
            f"Creating service history record for user_id={user_id}, tenant_id={tenant_id}"
        )

        if history_in.current_mileage is None:
            raise ValueError(
                "Current mileage is required to calculate next service mileage"
            )

        if history_in.serviced_at is None:
            raise ValueError("Service date is required to calculate next service date")

        next_service_mileage = calculate_next_service_mileage(
            history_in.current_mileage, history_in.service_type
        )
        next_service_date = calculate_next_service_date(
            history_in.serviced_at, history_in.service_type
        )

        history_data = {
            **history_in.dict(),
            "next_service_mileage": next_service_mileage,
            "next_service_date": next_service_date,
        }

        history_record = repo_create_service_history(self.db, tenant_id, history_data)

        return history_record

    def get_services_history(
        self,
        tenant_id: uuid.UUID,
        user_id: int,
        service_type: Optional[str] = None,
        vehicle_id: Optional[int] = None,
    ) -> List[ServiceHistory]:
        """List the authenticated client's service-history records, optionally filtered."""
        return repo_get_services_history_for_user(
            self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            service_type=service_type,
            vehicle_id=vehicle_id,
        )

    def get_service_history_by_id(
        self,
        history_id: int,
        tenant_id: uuid.UUID,
        user_id: int,
    ) -> Optional[ServiceHistory]:
        """Get a single service-history record owned by the client."""
        return repo_get_service_history_by_id(self.db, history_id, tenant_id, user_id)

    def update_service_history(
        self,
        history_id: int,
        history_in: ServiceHistoryUpdate,
        tenant_id: uuid.UUID,
        user_id: int,
    ) -> Optional[ServiceHistory]:
        """Update a service-history record, re-deriving next-service predictions when needed."""
        history = repo_get_service_history_by_id(
            self.db, history_id, tenant_id, user_id
        )
        if not history:
            return None

        update_data = history_in.model_dump(exclude_unset=True)

        # Normalize enum values to their string form for persistence and calculation.
        if "service_type" in update_data:
            update_data["service_type"] = getattr(
                update_data["service_type"], "value", update_data["service_type"]
            )

        # Re-derive predictions when the inputs that drive them change.
        effective_service_type = update_data.get("service_type", history.service_type)

        if "current_mileage" in update_data or "service_type" in update_data:
            current_mileage = update_data.get(
                "current_mileage", history.current_mileage
            )
            if (
                current_mileage is not None
                and "next_service_mileage" not in update_data
            ):
                update_data["next_service_mileage"] = calculate_next_service_mileage(
                    current_mileage, effective_service_type
                )

        if "serviced_at" in update_data or "service_type" in update_data:
            serviced_at = update_data.get("serviced_at", history.serviced_at)
            if serviced_at is not None and "next_service_date" not in update_data:
                update_data["next_service_date"] = calculate_next_service_date(
                    serviced_at, effective_service_type
                )

        return repo_update_service_history(self.db, history, update_data)

    def delete_service_history(
        self,
        history_id: int,
        tenant_id: uuid.UUID,
        user_id: int,
    ) -> bool:
        """Delete a service-history record owned by the client."""
        history = repo_get_service_history_by_id(
            self.db, history_id, tenant_id, user_id
        )
        if not history:
            return False
        return repo_delete_service_history(self.db, history)
=======
import uuid
from typing import List, Optional
from src.repositories.services_history import (
    repo_create_service_history,
    repo_get_services_history_for_user,
    repo_get_service_history_by_id,
    repo_update_service_history,
    repo_delete_service_history,
)
from sqlalchemy.orm import Session

from src.schemas.services_history import ServiceHistoryCreate, ServiceHistoryRead, ServiceHistoryUpdate
from src.models import Workshop, WorkshopClient
from src.models.services_history import ServiceHistory
from src.utils.services_history import calculate_next_service_date, calculate_next_service_mileage

from src.core.logger import get_logger

logger = get_logger(__name__)

class ServiceHistoryService:
  def __init__(self, db: Session):
    self.db = db
  
  def create_service_history(self, history_in: ServiceHistoryCreate, user_id: int, tenant_id: uuid.UUID) -> ServiceHistoryRead:
    # Create service history record
    logger.info(f"Creating service history record for user_id={user_id}, tenant_id={tenant_id}")
    
    if history_in.current_mileage is None:
        raise ValueError("Current mileage is required to calculate next service mileage")
      
    if history_in.serviced_at is None:
        raise ValueError("Service date is required to calculate next service date")
      
    next_service_mileage = calculate_next_service_mileage(history_in.current_mileage, history_in.service_type)
    next_service_date = calculate_next_service_date(history_in.serviced_at, history_in.service_type)
    
    history_data = {
        **history_in.dict(),
        "next_service_mileage": next_service_mileage,
        "next_service_date": next_service_date
    }
    
    history_record = repo_create_service_history(self.db, tenant_id, history_data)

    return history_record

  def get_services_history(
      self,
      tenant_id: uuid.UUID,
      user_id: int,
      service_type: Optional[str] = None,
      vehicle_id: Optional[int] = None,
  ) -> List[ServiceHistory]:
    """List the authenticated client's service-history records, optionally filtered."""
    return repo_get_services_history_for_user(
        self.db,
        tenant_id=tenant_id,
        user_id=user_id,
        service_type=service_type,
        vehicle_id=vehicle_id,
    )

  def get_service_history_by_id(
      self,
      history_id: int,
      tenant_id: uuid.UUID,
      user_id: int,
  ) -> Optional[ServiceHistory]:
    """Get a single service-history record owned by the client."""
    return repo_get_service_history_by_id(self.db, history_id, tenant_id, user_id)

  def update_service_history(
      self,
      history_id: int,
      history_in: ServiceHistoryUpdate,
      tenant_id: uuid.UUID,
      user_id: int,
  ) -> Optional[ServiceHistory]:
    """Update a service-history record, re-deriving next-service predictions when needed."""
    history = repo_get_service_history_by_id(self.db, history_id, tenant_id, user_id)
    if not history:
        return None

    update_data = history_in.model_dump(exclude_unset=True)

    # Normalize enum values to their string form for persistence and calculation.
    if "service_type" in update_data:
        update_data["service_type"] = getattr(update_data["service_type"], "value", update_data["service_type"])

    # Re-derive predictions when the inputs that drive them change.
    effective_service_type = update_data.get("service_type", history.service_type)

    if "current_mileage" in update_data or "service_type" in update_data:
        current_mileage = update_data.get("current_mileage", history.current_mileage)
        if current_mileage is not None and "next_service_mileage" not in update_data:
            update_data["next_service_mileage"] = calculate_next_service_mileage(current_mileage, effective_service_type)

    if "serviced_at" in update_data or "service_type" in update_data:
        serviced_at = update_data.get("serviced_at", history.serviced_at)
        if serviced_at is not None and "next_service_date" not in update_data:
            update_data["next_service_date"] = calculate_next_service_date(serviced_at, effective_service_type)

    return repo_update_service_history(self.db, history, update_data)

  def delete_service_history(
      self,
      history_id: int,
      tenant_id: uuid.UUID,
      user_id: int,
  ) -> bool:
    """Delete a service-history record owned by the client."""
    history = repo_get_service_history_by_id(self.db, history_id, tenant_id, user_id)
    if not history:
        return False
    return repo_delete_service_history(self.db, history)
>>>>>>> c5ef6a45 (WIP: salva alterações locais)
