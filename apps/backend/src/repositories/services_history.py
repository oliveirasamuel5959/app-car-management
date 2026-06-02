from uuid import UUID

from sqlalchemy.orm import Session

from src.models.services_history import ServicesHistory
from src.schemas.services_history import ServiceHistoryCreate, ServiceHistoryRead

def repo_create_service_history(db: Session, tenant_id: UUID | str, history_data: dict) -> ServiceHistoryRead:
  db_history = ServicesHistory(**history_data, tenant_id=tenant_id)
  db.add(db_history)
  db.commit()
  db.refresh(db_history)
  return db_history