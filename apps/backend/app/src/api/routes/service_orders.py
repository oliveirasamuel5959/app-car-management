from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.src.db.database import get_session
from app.src.schemas.services import ServiceRead, ServiceCreate
from app.src.services.services import ServiceService
from app.src.core.auth import get_current_user

router = APIRouter()


@router.post(
    "/",
    response_model=ServiceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new service order",
    description="Create a new service order for a workshop client"
)
def create_service_order(
    service_in: ServiceCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Create a new service order with validation of workshop and client."""
    service = ServiceService(db)

    try:
        user_id = current_user.get("user_id")
        return service.create_service(service_in, user_id=int(user_id))
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the service order"
        )
