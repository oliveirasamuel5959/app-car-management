from sqlalchemy import or_, and_
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from src.models.messages import Message


def repo_create_message(
    db: Session,
    tenant_id: UUID | str,
    sender_id: int,
    receiver_id: int,
    content: Optional[str],
    message_type: str = "text",
    file_url: Optional[str] = None,
    file_name: Optional[str] = None,
    file_size: Optional[int] = None,
    mime_type: Optional[str] = None,
) -> Message:
    message = Message(
        tenant_id=tenant_id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        content=content,
        message_type=message_type,
        file_url=file_url,
        file_name=file_name,
        file_size=file_size,
        mime_type=mime_type,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def repo_get_conversation(
    db: Session,
    tenant_id: UUID | str,
    user_a: int,
    user_b: int,
    skip: int = 0,
    limit: int = 50,
) -> List[Message]:
    """Return messages exchanged between two users, newest first."""
    return (
        db.query(Message)
        .filter(
            Message.tenant_id == tenant_id,
            or_(
                and_(Message.sender_id == user_a, Message.receiver_id == user_b),
                and_(Message.sender_id == user_b, Message.receiver_id == user_a),
            )
        )
        .order_by(Message.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def repo_get_message_by_id(db: Session, message_id: int, tenant_id: UUID | str) -> Optional[Message]:
    return db.query(Message).filter(Message.id == message_id, Message.tenant_id == tenant_id).first()
