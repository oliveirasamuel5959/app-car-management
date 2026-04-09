from fastapi import WebSocket
from typing import Dict, Optional
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections keyed by user_id."""

    def __init__(self):
        # user_id -> active WebSocket
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"[WS] User {user_id} connected. Online: {list(self.active_connections.keys())}")

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)
        logger.info(f"[WS] User {user_id} disconnected. Online: {list(self.active_connections.keys())}")

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections

    async def send_to_user(self, user_id: int, message: dict) -> bool:
        """Send a message to a specific user. Returns True if delivered."""
        websocket = self.active_connections.get(user_id)
        if not websocket:
            logger.warning(f"[WS] Cannot deliver to user {user_id}: not connected. Online: {list(self.active_connections.keys())}")
            return False
        try:
            await websocket.send_text(json.dumps(message))
            logger.info(f"[WS] Delivered {message.get('type')} to user {user_id}")
            return True
        except Exception as exc:
            logger.error(f"[WS] Failed to send to user {user_id}: {exc}")
            self.disconnect(user_id)
            return False

