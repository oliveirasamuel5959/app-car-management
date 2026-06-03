from uuid import UUID

from sqlalchemy.orm import Session

from src.models.services_history import ServiceHistory
from src.schemas.services_history import ServiceHistoryCreate, ServiceHistoryRead

from src.core.logger import get_logger

logger = get_logger(__name__)

def repo_create_service_history(db: Session, tenant_id: UUID | str, history_data: dict) -> ServiceHistoryRead:
  logger.info(f"Creating service history record for tenant_id={tenant_id} with data: {history_data}")
  db_history = ServiceHistory(**history_data, tenant_id=tenant_id)
  db.add(db_history)
  db.commit()
  db.refresh(db_history)
  return db_history