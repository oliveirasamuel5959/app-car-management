"""Service-layer WS event push tests (Phase 5 TG2).

Direct service-call tests exercise the no-loop fallback of `push_ws_event`;
the two TestClient tests exercise the async-loop and threadpool branches.
"""

import asyncio
import json
import uuid
from datetime import datetime, time

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.core.security import create_access_token
from src.core.websocket_manager import manager
from src.db.base import Base
from src.db.database import get_session
from src.main import app
from src.models import Tenant, User, Vehicle, Workshop, WorkshopClient
from src.models.services import Service
from src.services.messages import MessageService
from src.services.notifications import NotificationService
from src.services.schedules import ScheduleService
from src.services.services import ServiceService
from src.services.workshop_rating import WorkshopRatingService


class FakeWebSocket:
    """In-memory stand-in for fastapi.WebSocket; records what it receives."""

    def __init__(self):
        self.accepted = False
        self.sent: list[str] = []

    async def accept(self) -> None:
        self.accepted = True

    async def send_text(self, text: str) -> None:
        self.sent.append(text)


@pytest.fixture(autouse=True)
def _reset_manager():
    manager.active_connections.clear()
    yield
    manager.active_connections.clear()


def connect_fake(tenant_id, user_id: int) -> FakeWebSocket:
    ws = FakeWebSocket()
    asyncio.run(manager.connect(ws, tenant_id, user_id))
    return ws


def received(ws: FakeWebSocket) -> list[dict]:
    return [json.loads(text) for text in ws.sent]


# ─── Infra ────────────────────────────────────────────────────────────────────


def build_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def seed_service_graph():
    """Tenant A with a workshop user, a client user, and a pending service order."""
    session = build_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant)
    session.commit()

    workshop_user = User(
        id=1,
        tenant_id=tenant.id,
        name="Workshop Owner",
        age=32,
        sex="M",
        email="workshop@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    client_user = User(
        id=2,
        tenant_id=tenant.id,
        name="Client User",
        age=28,
        sex="F",
        email="client@test.dev",
        password_hash="hashed",
        role="CLIENT",
        is_active=True,
    )
    session.add_all([workshop_user, client_user])
    session.commit()

    workshop = Workshop(
        id=1,
        tenant_id=tenant.id,
        user_id=workshop_user.id,
        name="Tenant Workshop",
        email="tenant-workshop@test.dev",
        description="desc",
        latitude=10,
        longitude=20,
        rating_avg=4.2,
    )
    vehicle = Vehicle(
        id=1,
        tenant_id=tenant.id,
        brand="Honda",
        model="Civic",
        year=2020,
        plate="AAA-0001",
        user_id=client_user.id,
    )
    workshop_client = WorkshopClient(
        id=1,
        tenant_id=tenant.id,
        workshop_id=workshop.id,
        name="Client User",
        email=client_user.email,
        phone="5551999999999",
        vehicle_brand="Honda",
        vehicle_model="Civic",
        vehicle_year=2020,
        vehicle_plate="AAA-0001",
        user_id=client_user.id,
    )
    session.add_all([workshop, vehicle, workshop_client])
    session.commit()

    service = Service(
        tenant_id=tenant.id,
        workshop_id=workshop.id,
        vehicle_id=vehicle.id,
        workshop_client_id=workshop_client.id,
        name="Brake Inspection",
        description="Check front brakes",
        status="pending",
        progress_percentage=0,
        checkin_date=datetime(2026, 6, 1, 9, 0, 0),
        estimated_finish_date=datetime(2026, 6, 2, 17, 0, 0),
        estimated_cost=120.0,
    )
    session.add(service)
    session.commit()
    session.refresh(service)

    return session, tenant, workshop_user, client_user, service


def seed_two_tenant_graph():
    """Workshop in tenant A, client in tenant B (mirrors the rating flow)."""
    session = build_session()

    tenant_a = Tenant(id=uuid.uuid4(), slug="workshop-tenant", name="Workshop Tenant")
    tenant_b = Tenant(id=uuid.uuid4(), slug="client-tenant", name="Client Tenant")
    session.add_all([tenant_a, tenant_b])
    session.commit()

    workshop_user = User(
        tenant_id=tenant_a.id,
        name="Workshop Owner",
        age=35,
        sex="M",
        email="workshop@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    client_user = User(
        tenant_id=tenant_b.id,
        name="Client User",
        age=28,
        sex="F",
        email="client@test.dev",
        password_hash="hashed",
        role="CLIENT",
        is_active=True,
    )
    session.add_all([workshop_user, client_user])
    session.commit()

    workshop = Workshop(
        tenant_id=tenant_a.id,
        user_id=workshop_user.id,
        name="Test Workshop",
        email="ws@test.dev",
        description="A test workshop",
        latitude=10.0,
        longitude=20.0,
        rating_avg=0.0,
        opening_time=time(8, 0),
        closing_time=time(18, 0),
        work_days="1,2,3,4,5",
        employee_count=3,
    )
    vehicle = Vehicle(
        tenant_id=tenant_b.id,
        brand="Toyota",
        model="Corolla",
        year=2021,
        plate="XYZ-1234",
        user_id=client_user.id,
    )
    session.add_all([workshop, vehicle])
    session.commit()
    session.refresh(workshop)
    session.refresh(vehicle)

    return session, tenant_a, tenant_b, workshop_user, client_user, workshop, vehicle


def make_schedule(session, workshop, vehicle, tenant_a, tenant_b):
    return ScheduleService(session).create_schedule(
        {
            "workshop_id": workshop.id,
            "workshop_tenant_id": tenant_a.id,
            "vehicle_id": vehicle.id,
            "service_request_type": "manutencao",
            "problem_description": "Realtime test",
            "contact_phone": "11999999999",
            "contact_email": "client@test.dev",
            "scheduled_at": datetime(2026, 8, 20, 10, 0, 0),
        },
        client_tenant_id=tenant_b.id,
    )


# ─── Chat ─────────────────────────────────────────────────────────────────────


def test_send_message_pushes_new_message_to_recipient_and_sender():
    session, tenant, workshop_user, client_user, _ = seed_service_graph()
    ws_sender = connect_fake(tenant.id, workshop_user.id)
    ws_receiver = connect_fake(tenant.id, client_user.id)

    MessageService(session).send_message(
        tenant_id=tenant.id,
        sender_id=workshop_user.id,
        receiver_id=client_user.id,
        content="olá",
        message_type="text",
    )

    sender_events = received(ws_sender)
    receiver_events = received(ws_receiver)
    assert len(sender_events) == 1
    assert len(receiver_events) == 1
    event_ = receiver_events[0]
    assert event_["type"] == "new_message"
    assert event_["sender_id"] == workshop_user.id
    assert event_["receiver_id"] == client_user.id
    assert event_["content"] == "olá"
    assert event_["message_id"]
    assert event_["timestamp"]


def test_cross_tenant_chat_delivers_to_receiver_tenant_socket():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = (
        seed_two_tenant_graph()
    )
    ws_client = connect_fake(tenant_b.id, c_user.id)

    MessageService(session).send_message(
        tenant_id=tenant_a.id,
        sender_id=w_user.id,
        receiver_id=c_user.id,
        content="agendamento pronto",
        message_type="text",
    )

    events = received(ws_client)
    assert len(events) == 1
    assert events[0]["type"] == "new_message"
    assert events[0]["content"] == "agendamento pronto"


# ─── Notifications ────────────────────────────────────────────────────────────


def test_create_notification_pushes_notification_new():
    session, tenant, workshop_user, _, _ = seed_service_graph()
    ws = connect_fake(tenant.id, workshop_user.id)

    notification = NotificationService(session).create_notification(
        tenant_id=tenant.id,
        user_id=workshop_user.id,
        title="Atualização de Status",
        message="Serviço atualizado",
        notification_type="status_change",
    )

    events = received(ws)
    assert len(events) == 1
    event_ = events[0]
    assert event_["type"] == "notification_new"
    assert event_["notification_id"] == notification.id
    assert event_["title"] == "Atualização de Status"
    assert event_["text"] == "Serviço atualizado"
    assert event_["timestamp"]


# ─── Service order status ─────────────────────────────────────────────────────


def test_service_order_creation_pushes_order_status_change_to_client():
    session, tenant, workshop_user, client_user, service = seed_service_graph()
    ws_client = connect_fake(tenant.id, client_user.id)

    ServiceService(session).transition_service_order_for_workshop(
        service_id=service.id,
        user_id=workshop_user.id,
        tenant_id=tenant.id,
        next_status="cancelled",
    )

    events = received(ws_client)
    types = {event_["type"] for event_ in events}
    assert types == {"notification_new", "order_status_change"}
    event_ = next(e for e in events if e["type"] == "order_status_change")
    assert event_["service_order_id"] == service.id
    assert event_["old_status"] == "pending"
    assert event_["new_status"] == "cancelled"
    assert event_["actor_role"] == "WORKSHOP"
    assert event_["timestamp"]


def test_client_accept_pushes_order_status_change_to_workshop():
    session, tenant, workshop_user, client_user, service = seed_service_graph()
    ws_workshop = connect_fake(tenant.id, workshop_user.id)

    ServiceService(session).accept_service_order_for_client(
        service_id=service.id,
        user_id=client_user.id,
    )

    events = received(ws_workshop)
    types = {event_["type"] for event_ in events}
    assert types == {"notification_new", "order_status_change"}
    event_ = next(e for e in events if e["type"] == "order_status_change")
    assert event_["new_status"] == "confirmed"
    assert event_["actor_role"] == "CLIENT"


def test_order_status_event_not_delivered_to_other_tenant_socket():
    session, tenant, workshop_user, client_user, service = seed_service_graph()
    other_tenant = uuid.uuid4()
    # Same user id, but registered under a different tenant key
    ws_foreign = connect_fake(other_tenant, workshop_user.id)

    ServiceService(session).accept_service_order_for_client(
        service_id=service.id,
        user_id=client_user.id,
    )

    assert received(ws_foreign) == []


# ─── Schedules ────────────────────────────────────────────────────────────────


def test_schedule_status_notify_pushes_schedule_status_change_to_client():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = (
        seed_two_tenant_graph()
    )
    schedule = make_schedule(session, workshop, vehicle, tenant_a, tenant_b)
    ws_client = connect_fake(tenant_b.id, c_user.id)

    ScheduleService(session).notify_client_of_status(schedule, "aceito")

    events = received(ws_client)
    types = {event_["type"] for event_ in events}
    assert types == {"notification_new", "schedule_status_change"}
    event_ = next(e for e in events if e["type"] == "schedule_status_change")
    assert event_["schedule_id"] == schedule.id
    assert event_["new_status"] == "aceito"
    assert event_["timestamp"]


# ─── Ratings ──────────────────────────────────────────────────────────────────


def test_new_rating_pushes_rating_received_to_workshop():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = (
        seed_two_tenant_graph()
    )
    schedule = make_schedule(session, workshop, vehicle, tenant_a, tenant_b)
    ScheduleService(session).accept_schedule(schedule.id, tenant_a.id)
    rating = WorkshopRatingService(session).create_rating(
        {"schedule_id": schedule.id, "rating": 4, "comment": "Ótimo"},
        client_tenant_id=tenant_b.id,
    )
    ws_workshop = connect_fake(tenant_a.id, w_user.id)

    WorkshopRatingService(session).notify_workshop_of_new_rating(rating)

    events = received(ws_workshop)
    types = {event_["type"] for event_ in events}
    assert types == {"notification_new", "rating_received"}
    event_ = next(e for e in events if e["type"] == "rating_received")
    assert event_["schedule_id"] == schedule.id
    assert event_["rating"] == 4
    assert event_["timestamp"]


# ─── End-to-end over the app (loop + threadpool branches) ─────────────────────


def build_app_session():
    # TestClient runs the app in a portal thread; allow the in-memory SQLite
    # connection to be shared across threads.
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def make_token(user_id: int, role: str, tenant_id, email: str) -> str:
    return create_access_token(
        {
            "sub": email,
            "user_id": user_id,
            "role": role,
            "tenant_id": str(tenant_id),
            "tenant_slug": "slug",
        }
    )


def test_chat_message_over_ws_reaches_recipient_via_service_push():
    session = build_app_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    sender = User(
        id=1,
        tenant_id=tenant.id,
        name="Sender",
        age=30,
        sex="M",
        email="sender@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    receiver = User(
        id=2,
        tenant_id=tenant.id,
        name="Receiver",
        age=30,
        sex="F",
        email="receiver@test.dev",
        password_hash="hashed",
        role="CLIENT",
        is_active=True,
    )
    session.add_all([tenant, sender, receiver])
    session.commit()

    app.dependency_overrides[get_session] = lambda: session
    try:
        from fastapi.testclient import TestClient

        with TestClient(app) as client:
            with client.websocket_connect(
                "/messages/ws",
                params={
                    "token": make_token(1, "WORKSHOP", tenant.id, "sender@test.dev")
                },
            ) as ws_sender, client.websocket_connect(
                "/messages/ws",
                params={
                    "token": make_token(2, "CLIENT", tenant.id, "receiver@test.dev")
                },
            ) as ws_receiver:
                ws_sender.send_json(
                    {"type": "chat_message", "receiver_id": 2, "content": "olá"}
                )
                event_ = ws_receiver.receive_json()
                assert event_["type"] == "new_message"
                assert event_["sender_id"] == 1
                assert event_["content"] == "olá"
    finally:
        app.dependency_overrides.pop(get_session, None)


def test_schedule_create_route_pushes_to_workshop_over_ws():
    session = build_app_session()
    tenant_a = Tenant(id=uuid.uuid4(), slug="workshop-tenant", name="Workshop Tenant")
    tenant_b = Tenant(id=uuid.uuid4(), slug="client-tenant", name="Client Tenant")
    workshop_user = User(
        tenant_id=tenant_a.id,
        name="Workshop Owner",
        age=35,
        sex="M",
        email="workshop@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    client_user = User(
        tenant_id=tenant_b.id,
        name="Client User",
        age=28,
        sex="F",
        email="client@test.dev",
        password_hash="hashed",
        role="CLIENT",
        is_active=True,
    )
    session.add_all([tenant_a, tenant_b, workshop_user, client_user])
    session.commit()

    workshop = Workshop(
        tenant_id=tenant_a.id,
        user_id=workshop_user.id,
        name="Test Workshop",
        email="ws@test.dev",
        description="A test workshop",
        latitude=10.0,
        longitude=20.0,
        rating_avg=0.0,
        opening_time=time(8, 0),
        closing_time=time(18, 0),
        work_days="1,2,3,4,5",
        employee_count=3,
    )
    vehicle = Vehicle(
        tenant_id=tenant_b.id,
        brand="Toyota",
        model="Corolla",
        year=2021,
        plate="XYZ-1234",
        user_id=client_user.id,
    )
    session.add_all([workshop, vehicle])
    session.commit()

    app.dependency_overrides[get_session] = lambda: session
    try:
        from fastapi.testclient import TestClient

        with TestClient(app) as client:
            with client.websocket_connect(
                "/messages/ws",
                params={
                    "token": make_token(
                        workshop_user.id, "WORKSHOP", tenant_a.id, "workshop@test.dev"
                    )
                },
            ) as ws_workshop:
                response = client.post(
                    "/schedules/",
                    json={
                        "workshop_id": workshop.id,
                        "vehicle_id": vehicle.id,
                        "service_request_type": "manutencao",
                        "problem_description": "Realtime test",
                        "contact_phone": "11999999999",
                        "contact_email": "client@test.dev",
                        "scheduled_at": "2026-08-20T10:00:00",
                    },
                    headers={
                        "Authorization": f"Bearer {make_token(client_user.id, 'CLIENT', tenant_b.id, 'client@test.dev')}"
                    },
                )
                assert response.status_code == 201
                events = [ws_workshop.receive_json(), ws_workshop.receive_json()]
                types = {event_["type"] for event_ in events}
                assert types == {"notification_new", "schedule_status_change"}
                status_event = next(
                    e for e in events if e["type"] == "schedule_status_change"
                )
                assert status_event["new_status"] == "pendente"
    finally:
        app.dependency_overrides.pop(get_session, None)
