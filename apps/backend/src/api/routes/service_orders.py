from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.db.database import get_session
from src.schemas.services import (ServiceActionUpdate, ServiceCreate,
                                  ServiceRead, ServiceSummaryRead)
from src.services.services import ServiceService

router = APIRouter()


@router.post(
    "/",
    response_model=ServiceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new service order",
    description="Create a new service order for a workshop client",
)
def create_service_order(
    service_in: ServiceCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Create a new service order with validation of workshop and client."""
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshops can create service orders",
        )

    service = ServiceService(db)

    try:
        user_id = current_user.get("user_id")
        return service.create_service(
            service_in, user_id=int(user_id), tenant_id=current_user.get("tenant_id")
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the service order",
        )


@router.get(
    "/",
    response_model=list[ServiceRead],
    status_code=status.HTTP_200_OK,
    summary="List service orders for the current actor",
)
def list_service_orders(
    workshop_id: Optional[int] = Query(None),
    vehicle_id: Optional[int] = Query(None),
    workshop_client_id: Optional[int] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = ServiceService(db)
    user_id = int(current_user.get("user_id"))
    tenant_id = current_user.get("tenant_id")
    role = current_user.get("role")
    user_email = current_user.get("sub")

    if role == "WORKSHOP":
        if workshop_client_id is not None:
            return service.get_services_by_workshop_client_id(
                workshop_client_id, tenant_id
            )
        if workshop_id is not None:
            return service.get_services_by_workshop_id(workshop_id, tenant_id)
        if vehicle_id is not None:
            return service.get_services_by_vehicle_id(vehicle_id, tenant_id)
        return service.get_all_services(tenant_id)

    return service.get_services_by_user_id(user_id, None, user_email=user_email)


@router.get(
    "/summary",
    response_model=ServiceSummaryRead,
    status_code=status.HTTP_200_OK,
    summary="Get service-order summary for the current client",
)
def get_service_order_summary(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can access service-order summary",
        )

    service = ServiceService(db)
    return service.get_client_summary(
        int(current_user.get("user_id")),
        user_email=current_user.get("sub"),
    )


@router.get(
    "/{service_id}",
    response_model=ServiceRead,
    status_code=status.HTTP_200_OK,
    summary="Get a single service order",
)
def get_service_order(
    service_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = ServiceService(db)
    role = current_user.get("role")

    if role == "WORKSHOP":
        result = service.get_service_order_for_workshop(
            service_id, int(current_user.get("user_id")), current_user.get("tenant_id")
        )
    else:
        result = service.get_service_order_for_client(
            service_id,
            int(current_user.get("user_id")),
            user_email=current_user.get("sub"),
        )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service order not found"
        )

    return result


@router.patch(
    "/{service_id}/accept",
    response_model=ServiceRead,
    status_code=status.HTTP_200_OK,
    summary="Accept a pending service order as the client",
)
def accept_service_order(
    service_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can accept service orders",
        )

    service = ServiceService(db)
    try:
        updated_service = service.accept_service_order_for_client(
            service_id=service_id,
            user_id=int(current_user.get("user_id")),
            user_email=current_user.get("sub"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not updated_service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service order not found"
        )

    return updated_service


@router.patch(
    "/{service_id}/start",
    response_model=ServiceRead,
    status_code=status.HTTP_200_OK,
    summary="Start work on a confirmed service order",
)
def start_service_order(
    service_id: int,
    action: ServiceActionUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshops can start service orders",
        )

    service = ServiceService(db)
    try:
        updated_service = service.transition_service_order_for_workshop(
            service_id=service_id,
            user_id=int(current_user.get("user_id")),
            tenant_id=current_user.get("tenant_id"),
            next_status="in_progress",
            update=action,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not updated_service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service order not found"
        )

    return updated_service


@router.patch(
    "/{service_id}/complete",
    response_model=ServiceRead,
    status_code=status.HTTP_200_OK,
    summary="Mark a service order as completed",
)
def complete_service_order(
    service_id: int,
    action: ServiceActionUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshops can complete service orders",
        )

    service = ServiceService(db)
    try:
        updated_service = service.transition_service_order_for_workshop(
            service_id=service_id,
            user_id=int(current_user.get("user_id")),
            tenant_id=current_user.get("tenant_id"),
            next_status="completed",
            update=action,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not updated_service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service order not found"
        )

    return updated_service


@router.patch(
    "/{service_id}/cancel",
    response_model=ServiceRead,
    status_code=status.HTTP_200_OK,
    summary="Cancel a service order",
)
def cancel_service_order(
    service_id: int,
    action: ServiceActionUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    service = ServiceService(db)
    try:
        updated_service = service.cancel_service_order_for_actor(
            service_id=service_id,
            actor_role=current_user.get("role"),
            user_id=int(current_user.get("user_id")),
            tenant_id=current_user.get("tenant_id"),
            user_email=current_user.get("sub"),
            update=action,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not updated_service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service order not found"
        )

    return updated_service
