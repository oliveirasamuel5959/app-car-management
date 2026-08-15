"""Tenant-scoped WebSocket ConnectionManager tests (Phase 5 TG1)."""

import asyncio
import json
import uuid

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.core.security import create_access_token
from src.core.websocket_manager import ConnectionManager
from src.db.base import Base
from src.db.database import get_session
from src.main import app
from src.models import Tenant, User


class FakeWebSocket:
    """In-memory stand-in for fastapi.WebSocket; records what it receives."""

    def __init__(self, fail_on_send: bool = False):
        self.accepted = False
        self.sent: list[str] = []
        self.fail_on_send = fail_on_send

    async def accept(self) -> None:
        self.accepted = True

    async def send_text(self, text: str) -> None:
        if self.fail_on_send:
            raise RuntimeError("simulated send failure")
        self.sent.append(text)


TENANT_A = uuid.uuid4()
TENANT_B = uuid.uuid4()
USER_1 = 1
USER_2 = 2


def run(coro):
    return asyncio.run(coro)


def test_connect_registers_socket_under_tenant_and_user_key():
    manager = ConnectionManager()
    ws = FakeWebSocket()

    run(manager.connect(ws, TENANT_A, USER_1))

    assert manager.is_online(TENANT_A, USER_1) is True
    assert manager.is_online(TENANT_A, USER_2) is False
    assert manager.is_online(TENANT_B, USER_1) is False
    assert ws.accepted is True


def test_second_connection_for_same_user_coexists():
    manager = ConnectionManager()
    ws1, ws2 = FakeWebSocket(), FakeWebSocket()

    run(manager.connect(ws1, TENANT_A, USER_1))
    run(manager.connect(ws2, TENANT_A, USER_1))

    assert manager.is_online(TENANT_A, USER_1) is True


def test_disconnect_removes_only_the_given_socket():
    manager = ConnectionManager()
    ws1, ws2 = FakeWebSocket(), FakeWebSocket()
    run(manager.connect(ws1, TENANT_A, USER_1))
    run(manager.connect(ws2, TENANT_A, USER_1))

    manager.disconnect(TENANT_A, USER_1, ws1)

    assert manager.is_online(TENANT_A, USER_1) is True


def test_disconnect_of_last_socket_drops_the_user_key():
    manager = ConnectionManager()
    ws = FakeWebSocket()
    run(manager.connect(ws, TENANT_A, USER_1))

    manager.disconnect(TENANT_A, USER_1, ws)

    assert manager.is_online(TENANT_A, USER_1) is False


def test_send_to_user_delivers_to_all_sockets():
    manager = ConnectionManager()
    ws1, ws2 = FakeWebSocket(), FakeWebSocket()
    run(manager.connect(ws1, TENANT_A, USER_1))
    run(manager.connect(ws2, TENANT_A, USER_1))
    payload = {"type": "notification_new", "notification_id": 7}

    delivered = run(manager.send_to_user(TENANT_A, USER_1, payload))

    assert delivered is True
    assert [json.loads(s) for s in ws1.sent] == [payload]
    assert [json.loads(s) for s in ws2.sent] == [payload]


def test_send_to_user_accepts_tenant_id_as_string():
    """The route layer holds tenant_id as a JWT claim (str); the manager
    must normalize it to the UUID used at connect time."""
    manager = ConnectionManager()
    ws = FakeWebSocket()
    run(manager.connect(ws, TENANT_A, USER_1))
    payload = {"type": "pong"}

    delivered = run(manager.send_to_user(str(TENANT_A), USER_1, payload))

    assert delivered is True
    assert [json.loads(s) for s in ws.sent] == [payload]


def test_send_to_user_misses_wrong_tenant():
    manager = ConnectionManager()
    ws = FakeWebSocket()
    run(manager.connect(ws, TENANT_A, USER_1))

    delivered = run(manager.send_to_user(TENANT_B, USER_1, {"type": "ping"}))

    assert delivered is False
    assert ws.sent == []


def test_send_to_user_returns_false_when_user_not_connected():
    manager = ConnectionManager()

    delivered = run(manager.send_to_user(TENANT_A, USER_1, {"type": "ping"}))

    assert delivered is False


def test_send_to_user_prunes_dead_socket_and_delivers_to_the_rest():
    manager = ConnectionManager()
    healthy = FakeWebSocket()
    dead = FakeWebSocket(fail_on_send=True)
    run(manager.connect(healthy, TENANT_A, USER_1))
    run(manager.connect(dead, TENANT_A, USER_1))
    payload = {"type": "new_message", "message_id": "m1"}

    first = run(manager.send_to_user(TENANT_A, USER_1, payload))
    # the dead socket was pruned: a second send succeeds without touching it
    second = run(manager.send_to_user(TENANT_A, USER_1, payload))

    assert first is True
    assert second is True
    assert [json.loads(s) for s in healthy.sent] == [payload, payload]
    assert dead.sent == []
    assert manager.is_online(TENANT_A, USER_1) is True


# ─── End-to-end ping/pong over the WS route ───────────────────────────────────


def build_session():
    # TestClient runs the app in a portal thread; allow the in-memory SQLite
    # connection to be shared across threads.
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def test_ws_route_replies_pong_to_ping():
    session = build_session()
    tenant = Tenant(id=TENANT_A, slug="tenant-a", name="Tenant A")
    user = User(
        id=USER_1,
        tenant_id=TENANT_A,
        name="Ping User",
        age=30,
        sex="M",
        email="ping@example.com",
        password_hash="hashed",
        role="CLIENT",
        is_active=True,
    )
    session.add_all([tenant, user])
    session.commit()

    token = create_access_token(
        {
            "sub": "ping@example.com",
            "user_id": USER_1,
            "role": "CLIENT",
            "tenant_id": str(TENANT_A),
            "tenant_slug": "tenant-a",
        }
    )

    app.dependency_overrides[get_session] = lambda: session
    try:
        from fastapi.testclient import TestClient

        with TestClient(app) as client:
            with client.websocket_connect(
                "/messages/ws", params={"token": token}
            ) as websocket:
                websocket.send_json({"type": "ping"})
                reply = websocket.receive_json()
                assert reply == {"type": "pong"}
    finally:
        app.dependency_overrides.pop(get_session, None)
