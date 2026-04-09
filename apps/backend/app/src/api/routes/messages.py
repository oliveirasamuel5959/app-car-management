from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import json
import logging

logger = logging.getLogger(__name__)

from app.src.db.database import get_session
from app.src.core.auth import get_current_user, authenticate_websocket
from app.src.core.websocket_manager import ConnectionManager
from app.src.core.file_uploader import handle_file_upload
from app.src.schemas.messages import (
    MessageRead,
    WSIncomingMessage,
    FileUploadResponse,
)
from app.src.services.messages import MessageService

router = APIRouter()

# Module-level singleton so all connections share state
manager = ConnectionManager()


# ─── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_session),
):
    """
    Each authenticated user connects once. Messages are delivered to the
    recipient in real time if they are online, and always persisted.
    """
    try:
        user = await authenticate_websocket(token, db)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user.id)
    svc = MessageService(db)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                payload = WSIncomingMessage.model_validate_json(raw)
            except Exception:
                await websocket.send_text(
                    json.dumps({"type": "error", "message": "Invalid message format"})
                )
                continue

            if payload.type == "chat_message":
                try:
                    db_message = svc.send_message(
                        sender_id=user.id,
                        receiver_id=payload.receiver_id,
                        content=payload.content,
                        message_type=payload.message_type.value,
                    )
                    envelope = {
                        "type": "new_message",
                        "message_id": db_message.uuid,
                        "sender_id": user.id,
                        "sender_name": user.name,
                        "receiver_id": payload.receiver_id,
                        "content": db_message.content,
                        "timestamp": db_message.created_at.isoformat(),
                        "message_type": db_message.message_type,
                    }
                    logger.info(
                        f"[WS] Routing message: sender={user.id} -> receiver={payload.receiver_id} | "
                        f"online={list(manager.active_connections.keys())}"
                    )
                    # Deliver to recipient (if online) and echo back to sender
                    await manager.send_to_user(payload.receiver_id, envelope)
                    await manager.send_to_user(user.id, envelope)
                except ValueError as exc:
                    await websocket.send_text(
                        json.dumps({"type": "error", "message": str(exc)})
                    )

            elif payload.type == "typing_start":
                await manager.send_to_user(payload.receiver_id, {
                    "type": "user_typing",
                    "sender_id": user.id,
                    "sender_name": user.name,
                    "typing": True,
                })

            elif payload.type == "typing_stop":
                await manager.send_to_user(payload.receiver_id, {
                    "type": "user_typing",
                    "sender_id": user.id,
                    "sender_name": user.name,
                    "typing": False,
                })

    except WebSocketDisconnect:
        manager.disconnect(user.id)


# ─── Conversation History ─────────────────────────────────────────────────────

@router.get("/conversation/{other_user_id}", response_model=List[MessageRead])
def get_conversation(
    other_user_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    svc = MessageService(db)
    return svc.get_conversation(
        user_a=current_user["user_id"],
        user_b=other_user_id,
        skip=skip,
        limit=limit,
    )


# ─── File Upload ──────────────────────────────────────────────────────────────

@router.post("/conversation/{receiver_id}/upload", response_model=FileUploadResponse)
async def upload_file_to_user(
    receiver_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    file_info = await handle_file_upload(file, current_user["user_id"])
    svc = MessageService(db)
    try:
        db_message = svc.send_message(
            sender_id=current_user["user_id"],
            receiver_id=receiver_id,
            content=file_info["file_name"],
            message_type=file_info["file_type"],
            file_url=file_info["file_url"],
            file_name=file_info["file_name"],
            file_size=file_info["file_size"],
            mime_type=file_info["mime_type"],
        )
        envelope = {
            "type": "new_message",
            "message_id": db_message.uuid,
            "sender_id": current_user["user_id"],
            "receiver_id": receiver_id,
            "content": file_info["file_name"],
            "timestamp": db_message.created_at.isoformat(),
            "message_type": file_info["file_type"],
            "file_url": file_info["file_url"],
            "file_name": file_info["file_name"],
            "file_size": file_info["file_size"],
            "mime_type": file_info["mime_type"],
        }
        await manager.send_to_user(receiver_id, envelope)
        await manager.send_to_user(current_user["user_id"], envelope)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return FileUploadResponse(
        success=True,
        file_url=file_info["file_url"],
        file_name=file_info["file_name"],
        file_size=file_info["file_size"],
        mime_type=file_info["mime_type"],
        file_type=file_info["file_type"],
        message_id=db_message.uuid,
    )