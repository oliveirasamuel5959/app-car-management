import uuid
from datetime import datetime

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from src.db.base import Base
from src.models import Notification, Tenant, User, Vehicle, Workshop, WorkshopClient
from src.models.services import Service
from src.schemas.services import ServiceCreate
from src.services.services import ServiceService


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


def test_service_order_creation_notifies_only_client():
    session, tenant, workshop_user, client_user, _ = seed_service_graph()

    created_service = ServiceService(session).create_service(
        ServiceCreate(
            workshop_client_id=1,
            name="Brake Replacement",
            description="Replace front pads",
            status="pending",
            progress_percentage=0,
            checkin_date=datetime(2026, 6, 3, 9, 0, 0),
            estimated_finish_date=datetime(2026, 6, 4, 17, 0, 0),
            estimated_cost=200.0,
        ),
        user_id=workshop_user.id,
        tenant_id=tenant.id,
    )

    notifications = (
        session.query(Notification)
        .filter(Notification.service_id == created_service.id)
        .all()
    )

    assert len(notifications) == 1
    assert {notification.user_id for notification in notifications} == {client_user.id}
    assert all(
        notification.notification_type == "status_change"
        for notification in notifications
    )


def test_client_can_accept_pending_service_order_and_notify_workshop():
    session, tenant, workshop_user, client_user, service = seed_service_graph()

    updated_service = ServiceService(session).accept_service_order_for_client(
        service_id=service.id,
        user_id=client_user.id,
        user_email=client_user.email,
    )

    assert updated_service is not None
    assert updated_service.status == "confirmed"
    notifications = (
        session.query(Notification).filter(Notification.service_id == service.id).all()
    )
    assert len(notifications) == 1
    assert {notification.user_id for notification in notifications} == {
        workshop_user.id
    }
    assert all(
        notification.notification_type == "status_change"
        for notification in notifications
    )


def test_client_can_reject_pending_service_order_and_notify_workshop():
    session, tenant, workshop_user, client_user, service = seed_service_graph()

    updated_service = ServiceService(session).reject_service_order_for_client(
        service_id=service.id,
        user_id=client_user.id,
        user_email=client_user.email,
    )

    assert updated_service is not None
    assert updated_service.status == "rejected"
    notifications = (
        session.query(Notification).filter(Notification.service_id == service.id).all()
    )
    assert len(notifications) == 1
    assert {notification.user_id for notification in notifications} == {
        workshop_user.id
    }
    assert all(
        notification.notification_type == "status_change"
        for notification in notifications
    )


def test_rejected_order_is_terminal():
    session, tenant, workshop_user, client_user, service = seed_service_graph()
    service_service = ServiceService(session)
    service_service.reject_service_order_for_client(
        service_id=service.id,
        user_id=client_user.id,
        user_email=client_user.email,
    )

    with pytest.raises(ValueError):
        service_service.accept_service_order_for_client(
            service_id=service.id,
            user_id=client_user.id,
            user_email=client_user.email,
        )
    with pytest.raises(ValueError):
        service_service.transition_service_order_for_workshop(
            service_id=service.id,
            user_id=workshop_user.id,
            tenant_id=tenant.id,
            next_status="in_progress",
        )
    with pytest.raises(ValueError):
        service_service.transition_service_order_for_workshop(
            service_id=service.id,
            user_id=workshop_user.id,
            tenant_id=tenant.id,
            next_status="completed",
        )
    with pytest.raises(ValueError):
        service_service.cancel_service_order_for_actor(
            service_id=service.id,
            actor_role="WORKSHOP",
            user_id=workshop_user.id,
            tenant_id=tenant.id,
        )


def test_create_requires_estimated_cost_and_finish_date():
    session, tenant, workshop_user, client_user, _ = seed_service_graph()
    service_service = ServiceService(session)
    base_fields = dict(
        workshop_client_id=1,
        name="Brake Replacement",
        checkin_date=datetime(2026, 6, 3, 9, 0, 0),
    )

    with pytest.raises(ValueError):
        service_service.create_service(
            ServiceCreate(
                **base_fields,
                estimated_finish_date=datetime(2026, 6, 4, 17, 0, 0),
            ),
            user_id=workshop_user.id,
            tenant_id=tenant.id,
        )

    with pytest.raises(ValueError):
        service_service.create_service(
            ServiceCreate(**base_fields, estimated_cost=200.0),
            user_id=workshop_user.id,
            tenant_id=tenant.id,
        )


def test_create_without_client_vehicle_raises_pt_br_error():
    session, tenant, workshop_user, client_user, _ = seed_service_graph()
    session.query(Vehicle).delete()
    session.commit()

    with pytest.raises(ValueError, match="não possui veículo"):
        ServiceService(session).create_service(
            ServiceCreate(
                workshop_client_id=1,
                name="Brake Replacement",
                checkin_date=datetime(2026, 6, 3, 9, 0, 0),
                estimated_finish_date=datetime(2026, 6, 4, 17, 0, 0),
                estimated_cost=200.0,
            ),
            user_id=workshop_user.id,
            tenant_id=tenant.id,
        )


def test_workshop_must_follow_transition_matrix():
    session, tenant, workshop_user, client_user, service = seed_service_graph()
    service_service = ServiceService(session)

    with pytest.raises(ValueError):
        service_service.transition_service_order_for_workshop(
            service_id=service.id,
            user_id=workshop_user.id,
            tenant_id=tenant.id,
            next_status="in_progress",
        )

    service_service.accept_service_order_for_client(
        service_id=service.id,
        user_id=client_user.id,
        user_email=client_user.email,
    )
    in_progress = service_service.transition_service_order_for_workshop(
        service_id=service.id,
        user_id=workshop_user.id,
        tenant_id=tenant.id,
        next_status="in_progress",
    )
    assert in_progress.status == "in_progress"

    completed = service_service.transition_service_order_for_workshop(
        service_id=in_progress.id,
        user_id=workshop_user.id,
        tenant_id=tenant.id,
        next_status="completed",
    )

    assert completed.status == "completed"
    assert completed.progress_percentage == 100
    assert completed.finished_at is not None


def test_client_cannot_cancel_confirmed_order():
    session, tenant, workshop_user, client_user, service = seed_service_graph()
    service_service = ServiceService(session)
    service_service.accept_service_order_for_client(
        service_id=service.id,
        user_id=client_user.id,
        user_email=client_user.email,
    )

    with pytest.raises(ValueError):
        service_service.cancel_service_order_for_actor(
            service_id=service.id,
            actor_role="CLIENT",
            user_id=client_user.id,
            user_email=client_user.email,
        )


def test_client_summary_counts_current_orders():
    session, tenant, workshop_user, client_user, service = seed_service_graph()
    service_service = ServiceService(session)
    service_service.accept_service_order_for_client(
        service_id=service.id,
        user_id=client_user.id,
        user_email=client_user.email,
    )

    summary = service_service.get_client_summary(
        client_user.id, user_email=client_user.email
    )

    assert summary.total_orders == 1
    assert summary.active_orders == 1
    assert summary.confirmed_orders == 1
    assert summary.recent_orders[0].id == service.id
