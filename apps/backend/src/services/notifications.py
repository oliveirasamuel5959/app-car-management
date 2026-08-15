from datetime import UTC, datetime

from sqlalchemy.orm import Session

from src.core.ws_push import push_ws_event
from src.models.notification import Notification
from src.repositories.notifications import (
    repo_create_notification,
    repo_get_notification_by_id,
    repo_get_notifications_by_user_id,
    repo_get_unread_notifications_count,
    repo_mark_all_notifications_as_read,
    repo_mark_notification_as_read,
)


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_notification(
        self,
        tenant_id,
        user_id: int,
        title: str,
        message: str,
        notification_type: str,
        service_id: int | None = None,
        schedule_id: int | None = None,
    ) -> Notification:
        """Create a new notification."""
        notification_data = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "service_id": service_id,
            "schedule_id": schedule_id,
        }
        notification = repo_create_notification(self.db, tenant_id, notification_data)
        push_ws_event(
            tenant_id,
            user_id,
            {
                "type": "notification_new",
                "notification_id": notification.id,
                "title": title,
                "text": message,
                "timestamp": datetime.now(UTC).isoformat(),
            },
        )
        return notification

    def get_notification_by_id(
        self, tenant_id, notification_id: int
    ) -> Notification | None:
        """Get a notification by ID."""
        return repo_get_notification_by_id(self.db, notification_id, tenant_id)

    def get_notifications_by_user_id(
        self, tenant_id, user_id: int, limit: int = 20
    ) -> list[Notification]:
        """Get all notifications for a user."""
        return repo_get_notifications_by_user_id(self.db, tenant_id, user_id, limit)

    def get_unread_count(self, tenant_id, user_id: int) -> int:
        """Get count of unread notifications for a user."""
        return repo_get_unread_notifications_count(self.db, tenant_id, user_id)

    def mark_as_read(self, tenant_id, notification_id: int) -> Notification | None:
        """Mark a notification as read."""
        return repo_mark_notification_as_read(self.db, tenant_id, notification_id)

    def mark_all_as_read(self, tenant_id, user_id: int) -> int:
        """Mark all notifications as read for a user."""
        return repo_mark_all_notifications_as_read(self.db, tenant_id, user_id)

    def create_status_change_notification(
        self,
        tenant_id,
        user_id: int,
        service_name: str,
        old_status: str,
        new_status: str,
        service_id: int | None = None,
    ) -> Notification:
        """Create a status change notification."""
        status_names = {
            "pending": "Pendente",
            "confirmed": "Confirmado",
            "in_progress": "Em Progresso",
            "completed": "Concluído",
            "cancelled": "Cancelado",
        }

        new_status_name = status_names.get(new_status, new_status)
        title = "Atualização de Status"
        message = f"Serviço '{service_name}' foi atualizado para: {new_status_name}"

        return self.create_notification(
            tenant_id=tenant_id,
            user_id=user_id,
            title=title,
            message=message,
            notification_type="status_change",
            service_id=service_id,
        )

    def create_schedule_status_notification(
        self,
        tenant_id,
        user_id: int,
        schedule_id: int,
        new_status: str,
        workshop_name: str = "",
    ) -> Notification:
        """Create a notification for a schedule status change with Portuguese labels."""
        status_labels = {
            "pendente": "Pendente",
            "visualizado": "Visualizado",
            "aceito": "Aceito",
            "recusado": "Recusado",
        }
        label = status_labels.get(new_status, new_status)

        if new_status == "pendente":
            title = "Novo Agendamento"
            message = (
                f"Nova solicitação de agendamento recebida da oficina {workshop_name}"
                if workshop_name
                else "Nova solicitação de agendamento recebida"
            )
        else:
            title = "Atualização de Agendamento"
            message = f"Seu agendamento foi atualizado para: {label}"

        return self.create_notification(
            tenant_id=tenant_id,
            user_id=user_id,
            title=title,
            message=message,
            notification_type="schedule_update",
            schedule_id=schedule_id,
        )

    def create_rating_notification(
        self,
        tenant_id,
        user_id: int,
        schedule_id: int | None,
        rating_value: int,
    ) -> Notification:
        """Create a notification for a new workshop rating with a Portuguese label."""
        title = "Nova Avaliação"
        message = f"Você recebeu uma avaliação de {rating_value} estrelas"

        return self.create_notification(
            tenant_id=tenant_id,
            user_id=user_id,
            title=title,
            message=message,
            notification_type="rating_new",
            schedule_id=schedule_id,
        )
