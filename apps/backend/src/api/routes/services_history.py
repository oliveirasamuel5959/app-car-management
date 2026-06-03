from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.db.database import get_session
from src.schemas.services_history import ServiceHistoryCreate, ServiceHistoryRead
from src.services.services_history import ServiceHistoryService
from src.core.auth import get_current_user

from src.core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

@router.post(
    "/",
    response_model=ServiceHistoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new service order",
    description="Create a new service order for a workshop client"
)
def create_service_history(
    history_in: ServiceHistoryCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Create a new service history record with validation of workshop and client."""
    if current_user.get("role") != "CLIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only clients can create service history records")

    service = ServiceHistoryService(db)

    try:
        user_id = current_user.get("user_id")
        tenant_id = current_user.get("tenant_id")
        logger.info(f"Creating service history record for user_id={user_id}, tenant_id={tenant_id}")
        return service.create_service_history(history_in, user_id=int(user_id), tenant_id=tenant_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating the service history record: {str(e)}"
        )