import json
import logging
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections keyed by (tenant_id, user_id).

    A user may hold several connections (one per tab/device); sends are
    broadcast to all of them and failed sockets are pruned.
    """

    def __init__(self):
        # (tenant_id, user_id) -> set of active WebSockets
        self.active_connections: dict[tuple[UUID, int], set[WebSocket]] = {}

    @staticmethod
    def _key(tenant_id: UUID | str, user_id: int) -> tuple[UUID, int]:
        """Normalize the key: callers hold tenant_id either as a UUID (ORM)
        or as a JWT claim string (route layer)."""
        tenant = tenant_id if isinstance(tenant_id, UUID) else UUID(str(tenant_id))
        return (tenant, int(user_id))

    async def connect(self, websocket: WebSocket, tenant_id: UUID | str, user_id: int):
        await websocket.accept()
        self.active_connections.setdefault(self._key(tenant_id, user_id), set()).add(
            websocket
        )
        logger.info(
            f"[WS] User {user_id} (tenant {tenant_id}) connected. "
            f"Online users: {len(self.active_connections)}"
        )

    def disconnect(self, tenant_id: UUID | str, user_id: int, websocket: WebSocket):
        key = self._key(tenant_id, user_id)
        sockets = self.active_connections.get(key)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self.active_connections.pop(key, None)
        logger.info(
            f"[WS] User {user_id} (tenant {tenant_id}) disconnected. "
            f"Online users: {len(self.active_connections)}"
        )

    def is_online(self, tenant_id: UUID | str, user_id: int) -> bool:
        return bool(self.active_connections.get(self._key(tenant_id, user_id)))

    async def send_to_user(
        self, tenant_id: UUID | str, user_id: int, message: dict
    ) -> bool:
        """Send a message to all of a user's connections within the tenant.

        Returns True if at least one connection received it; sockets whose
        send fails are pruned.
        """
        key = self._key(tenant_id, user_id)
        sockets = self.active_connections.get(key)
        if not sockets:
            logger.warning(
                f"[WS] Cannot deliver to user {user_id} "
                f"(tenant {tenant_id}): not connected."
            )
            return False
        delivered = False
        for websocket in list(sockets):
            try:
                await websocket.send_text(json.dumps(message))
                delivered = True
                logger.info(f"[WS] Delivered {message.get('type')} to user {user_id}")
            except Exception as exc:
                logger.error(
                    f"[WS] Failed to send to user {user_id}: {exc}; "
                    "pruning connection"
                )
                sockets.discard(websocket)
        if not sockets:
            self.active_connections.pop(key, None)
        return delivered


# Module-level singleton shared by the WS route and the service layer
manager = ConnectionManager()
