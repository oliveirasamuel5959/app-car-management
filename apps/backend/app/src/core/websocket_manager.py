from fastapi import WebSocket
from typing import Dict, Optional
import json


class ConnectionManager:
    """Manages active WebSocket connections keyed by user_id."""

    def __init__(self):
        # user_id -> active WebSocket
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        self.active_connections.pop(user_id, None)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections

    async def send_to_user(self, user_id: int, message: dict) -> bool:
        """Send a message to a specific user. Returns True if delivered."""
        websocket = self.active_connections.get(user_id)
        if not websocket:
            return False
        try:
            await websocket.send_text(json.dumps(message))
            return True
        except Exception:
            self.disconnect(user_id)
            return False

