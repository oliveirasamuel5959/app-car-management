"""Fire-and-forget WS event push usable from sync services and async handlers.

Services are synchronous (SQLAlchemy sync) and may be invoked from async route
handlers (event loop running in this thread) or from sync route handlers
(FastAPI threadpool, no loop here). This helper routes the coroutine to a
place where it can run:

- a running loop in the current thread → schedule as a task;
- otherwise the loop captured at app startup (see main.py lifespan) →
  thread-safe handoff via ``run_coroutine_threadsafe``;
- otherwise (e.g. tests calling services directly) → run inline.
"""

import asyncio
import logging

from src.core.websocket_manager import manager

logger = logging.getLogger(__name__)

# Loop captured at app startup (lifespan) so pushes from sync routes running
# in the threadpool can schedule onto the loop that owns the sockets.
_main_loop: asyncio.AbstractEventLoop | None = None


def capture_ws_loop() -> None:
    """Store the running event loop (called from the app lifespan)."""
    global _main_loop
    try:
        _main_loop = asyncio.get_running_loop()
    except RuntimeError:
        pass


def push_ws_event(tenant_id, user_id: int, payload: dict) -> None:
    """Push an event to a user's connections. Best effort, never raises."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop is not None:
        loop.create_task(manager.send_to_user(tenant_id, user_id, payload))
        return

    if (
        _main_loop is not None
        and not _main_loop.is_closed()
        and _main_loop.is_running()
    ):
        asyncio.run_coroutine_threadsafe(
            manager.send_to_user(tenant_id, user_id, payload), _main_loop
        )
        return

    # No loop anywhere: run inline (short-lived, only in direct-call tests).
    asyncio.run(manager.send_to_user(tenant_id, user_id, payload))
