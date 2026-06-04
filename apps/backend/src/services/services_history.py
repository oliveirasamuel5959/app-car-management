import uuid
from typing import List, Optional
from src.repositories.services_history import repo_create_service_history
from sqlalchemy.orm import Session

from src.schemas.services_history import ServiceHistoryCreate, ServiceHistoryRead
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
  