from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from src.core.ws_push import push_ws_event
from src.models.messages import Message
from src.models.services import Service
from src.models.user import User
from src.models.vehicle import Vehicle
from src.models.workshop import Workshop
from src.models.workshop_client import WorkshopClient
from src.repositories.messages import repo_create_message, repo_get_conversation


class MessageService:
    def __init__(self, db: Session):
        self.db = db

    def _get_user_any_tenant(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def _resolve_conversation_tenant(
        self, user_a: User, user_b: User, preferred_tenant_id=None
    ):
        existing_message = (
            self.db.query(Message.tenant_id)
            .filter(
                or_(
                    and_(
                        Message.sender_id == user_a.id, Message.receiver_id == user_b.id
                    ),
                    and_(
                        Message.sender_id == user_b.id, Message.receiver_id == user_a.id
                    ),
                )
            )
            .order_by(Message.created_at.desc())
            .first()
        )
        if existing_message:
            return existing_message[0]

        if user_a.tenant_id == user_b.tenant_id:
            return preferred_tenant_id or user_a.tenant_id

        shared_service = (
            self.db.query(Service.tenant_id)
            .join(Workshop, Service.workshop_id == Workshop.id)
            .outerjoin(Vehicle, Service.vehicle_id == Vehicle.id)
            .outerjoin(WorkshopClient, Service.workshop_client_id == WorkshopClient.id)
            .filter(
                or_(
                    and_(
                        Workshop.user_id == user_a.id,
                        or_(
                            Vehicle.user_id == user_b.id,
                            WorkshopClient.user_id == user_b.id,
                            WorkshopClient.email == user_b.email,
                        ),
                    ),
                    and_(
                        Workshop.user_id == user_b.id,
                        or_(
                            Vehicle.user_id == user_a.id,
                            WorkshopClient.user_id == user_a.id,
                            WorkshopClient.email == user_a.email,
                        ),
                    ),
                )
            )
            .order_by(Service.checkin_date.desc(), Service.id.desc())
            .first()
        )
        if shared_service:
            return shared_service[0]

        return preferred_tenant_id

    def send_message(
        self,
        tenant_id,
        sender_id: int,
        receiver_id: int,
        content: str | None,
        message_type: str = "text",
        file_url: str | None = None,
        file_name: str | None = None,
        file_size: int | None = None,
        mime_type: str | None = None,
    ) -> Message:
        if sender_id == receiver_id:
            raise ValueError("Cannot send a message to yourself")

        sender = self._get_user_any_tenant(sender_id)
        receiver = self._get_user_any_tenant(receiver_id)
        if not receiver or not receiver.is_active:
            raise ValueError("Recipient user not found or inactive")
        if not sender or not sender.is_active:
            raise ValueError("Sender user not found or inactive")

        conversation_tenant_id = self._resolve_conversation_tenant(
            sender, receiver, preferred_tenant_id=tenant_id
        )
        if conversation_tenant_id is None:
            raise ValueError("No shared conversation context found")

        db_message = repo_create_message(
            self.db,
            tenant_id=conversation_tenant_id,
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
        )
        self._push_new_message(db_message, sender, receiver)
        return db_message

    def _push_new_message(self, db_message: Message, sender: User, receiver: User):
        """Push the new_message envelope to receiver and echo to the sender."""
        envelope = {
            "type": "new_message",
            "message_id": db_message.uuid,
            "sender_id": sender.id,
            "sender_name": sender.name,
            "receiver_id": receiver.id,
            "content": db_message.content,
            "timestamp": db_message.created_at.isoformat(),
            "message_type": db_message.message_type,
            "file_url": db_message.file_url,
            "file_name": db_message.file_name,
            "file_size": db_message.file_size,
            "mime_type": db_message.mime_type,
        }
        # Sockets are keyed by each user's own tenant, which may differ in
        # cross-tenant conversations (client tenant vs workshop tenant).
        push_ws_event(receiver.tenant_id, receiver.id, envelope)
        push_ws_event(sender.tenant_id, sender.id, envelope)

    def get_conversation(
        self, tenant_id, user_a: int, user_b: int, skip: int = 0, limit: int = 50
    ) -> list[Message]:
        """Return messages between two users in chronological order (oldest first)."""
        sender = self._get_user_any_tenant(user_a)
        receiver = self._get_user_any_tenant(user_b)
        if not sender or not receiver:
            return []

        conversation_tenant_id = self._resolve_conversation_tenant(
            sender, receiver, preferred_tenant_id=tenant_id
        )
        if conversation_tenant_id is None:
            return []

        messages = repo_get_conversation(
            self.db, conversation_tenant_id, user_a, user_b, skip=skip, limit=limit
        )
        return list(reversed(messages))
