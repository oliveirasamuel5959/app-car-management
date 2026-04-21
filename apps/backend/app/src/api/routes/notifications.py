from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.src.db.database import get_session
from app.src.core.auth import get_current_user
from app.src.services.notifications import NotificationService
from app.src.schemas.notifications import NotificationRead, NotificationUpdate

router = APIRouter()


@router.get("/notifications", response_model=List[NotificationRead])
def get_notifications(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Get all notifications for the current user."""
    notification_service = NotificationService(db)
    notifications = notification_service.get_notifications_by_user_id(current_user.get("user_id"), limit)
    return notifications


@router.get("/notifications/unread-count")
def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Get count of unread notifications for the current user."""
    notification_service = NotificationService(db)
    count = notification_service.get_unread_count(current_user.get("user_id"))
    return {"unread_count": count}


@router.put("/notifications/{notification_id}", response_model=NotificationRead)
def mark_notification_as_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Mark a notification as read."""
    notification_service = NotificationService(db)
    notification = notification_service.get_notification_by_id(notification_id)

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.user_id != current_user.get("user_id"):
        raise HTTPException(status_code=403, detail="Not authorized to update this notification")

    updated_notification = notification_service.mark_as_read(notification_id)
    return updated_notification


@router.put("/notifications/mark-all-read")
def mark_all_as_read(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Mark all notifications as read for the current user."""
    notification_service = NotificationService(db)
    count = notification_service.mark_all_as_read(current_user.get("user_id"))
    return {"marked_as_read": count}
