from sqlalchemy.orm import Session
from typing import List, Optional

from app.src.models.messages import Message
from app.src.repositories.messages import (
    repo_create_message,
    repo_get_conversation,
)
from app.src.repositories.user import repo_get_user_by_id


class MessageService:
    def __init__(self, db: Session):
        self.db = db

    def send_message(
        self,
        sender_id: int,
        receiver_id: int,
        content: Optional[str],
        message_type: str = "text",
        file_url: Optional[str] = None,
        file_name: Optional[str] = None,
        file_size: Optional[int] = None,
        mime_type: Optional[str] = None,
    ) -> Message:
        if sender_id == receiver_id:
            raise ValueError("Cannot send a message to yourself")
        receiver = repo_get_user_by_id(self.db, receiver_id)
        if not receiver or not receiver.is_active:
            raise ValueError("Recipient user not found or inactive")
        return repo_create_message(
            self.db,
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            message_type=message_type,
            file_url=file_url,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
        )

    def get_conversation(
        self, user_a: int, user_b: int, skip: int = 0, limit: int = 50
    ) -> List[Message]:
        """Return messages between two users in chronological order (oldest first)."""
        messages = repo_get_conversation(self.db, user_a, user_b, skip=skip, limit=limit)
        return list(reversed(messages))
