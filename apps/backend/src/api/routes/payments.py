from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.auth import get_current_user
from src.db.database import get_session
from src.schemas.payments import PaymentIntentRead, PaymentRead, PaymentRefundRead
from src.services.payments import PaymentService

router = APIRouter()


@router.post(
    "/service-orders/{service_order_id}/intent",
    response_model=PaymentIntentRead,
    status_code=status.HTTP_200_OK,
    summary="Create a payment intent for a completed service order",
)
def create_payment_intent(
    service_order_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can pay service orders",
        )

    try:
        result = PaymentService(db).create_payment_intent(
            service_order_id=service_order_id,
            user_id=int(current_user.get("user_id")),
            user_email=current_user.get("sub"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Service order not found"
        )
    return result


@router.post(
    "/{payment_id}/confirm",
    response_model=PaymentRead,
    status_code=status.HTTP_200_OK,
    summary="Confirm a payment after the client paid the intent",
)
def confirm_payment(
    payment_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can confirm payments",
        )

    try:
        result = PaymentService(db).confirm_payment(
            payment_id=payment_id,
            user_id=int(current_user.get("user_id")),
            user_email=current_user.get("sub"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
        )
    return result


@router.get(
    "/service-orders/{service_order_id}",
    response_model=PaymentRead,
    status_code=status.HTTP_200_OK,
    summary="Get the payment state of a service order",
)
def get_payment_for_order(
    service_order_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    result = PaymentService(db).get_payment_for_order(
        service_order_id=service_order_id,
        user_id=int(current_user.get("user_id")),
        tenant_id=current_user.get("tenant_id"),
        role=current_user.get("role"),
        user_email=current_user.get("sub"),
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
        )
    return result


@router.post(
    "/{payment_id}/refund",
    response_model=PaymentRefundRead,
    status_code=status.HTTP_200_OK,
    summary="Refund a succeeded payment as the workshop",
)
def refund_payment(
    payment_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if current_user.get("role") != "WORKSHOP":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workshops can refund payments",
        )

    try:
        result = PaymentService(db).refund_payment(
            payment_id=payment_id,
            user_id=int(current_user.get("user_id")),
            tenant_id=current_user.get("tenant_id"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found"
        )
    return result
