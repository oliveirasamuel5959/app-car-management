from uuid import UUID

from sqlalchemy.orm import Session

from src.models.notification import Notification


def repo_create_notification(
    db: Session, tenant_id: UUID | str, notification_data: dict
) -> Notification:
    """Create a new notification in the database."""
    notification = Notification(**notification_data, tenant_id=tenant_id)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def repo_get_notification_by_id(
    db: Session, notification_id: int, tenant_id: UUID | str
) -> Notification | None:
    """Get a notification by its ID."""
    return (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.tenant_id == tenant_id)
        .first()
    )


def repo_get_notifications_by_user_id(
    db: Session, tenant_id: UUID | str, user_id: int, limit: int = 20
) -> list[Notification]:
    """Get all notifications for a specific user, ordered by most recent first."""
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
        )
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )


def repo_get_unread_notifications_count(
    db: Session, tenant_id: UUID | str, user_id: int
) -> int:
    """Get count of unread notifications for a user."""
    return (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_read == False,
        )
        .count()
    )


def repo_mark_notification_as_read(
    db: Session, tenant_id: UUID | str, notification_id: int
) -> Notification | None:
    """Mark a notification as read."""
    from sqlalchemy.sql import func

    notification = repo_get_notification_by_id(db, notification_id, tenant_id)
    if notification:
        notification.is_read = True
        notification.read_at = func.now()
        db.commit()
        db.refresh(notification)
    return notification


def repo_mark_all_notifications_as_read(
    db: Session, tenant_id: UUID | str, user_id: int
) -> int:
    """Mark all notifications as read for a user. Returns count of updated notifications."""
    from sqlalchemy.sql import func

    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.tenant_id == tenant_id,
            Notification.is_read == False,
        )
        .update({Notification.is_read: True, Notification.read_at: func.now()})
    )
    db.commit()
    return count
