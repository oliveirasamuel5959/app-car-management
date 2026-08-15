import uuid
from datetime import datetime

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from src.db.base import Base
from src.models import Tenant, User, Vehicle, Workshop, WorkshopClient
from src.models.service_part import ServicePart
from src.models.services import Service
from src.models.services_history import ServiceHistory
from src.schemas.services import ServiceActionUpdate, ServicePartCreate
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


def seed_graph():
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
        status="confirmed",
        progress_percentage=10,
        checkin_date=datetime(2026, 6, 1, 9, 0, 0),
        estimated_finish_date=datetime(2026, 6, 2, 17, 0, 0),
        estimated_cost=120.0,
    )
    session.add(service)
    session.commit()
    session.refresh(service)

    return {
        "session": session,
        "tenant": tenant,
        "workshop_user": workshop_user,
        "client_user": client_user,
        "workshop": workshop,
        "service": service,
    }


def complete_order(session, tenant, workshop_user, service, **completion_fields):
    session_service = ServiceService(session)
    session_service.transition_service_order_for_workshop(
        service_id=service.id,
        user_id=workshop_user.id,
        tenant_id=tenant.id,
        next_status="in_progress",
    )
    return session_service.transition_service_order_for_workshop(
        service_id=service.id,
        user_id=workshop_user.id,
        tenant_id=tenant.id,
        next_status="completed",
        update=ServiceActionUpdate(**completion_fields) if completion_fields else None,
    )


def test_completion_with_parts_creates_part_rows_and_derives_costs():
    g = seed_graph()

    completed = complete_order(
        g["session"],
        g["tenant"],
        g["workshop_user"],
        g["service"],
        parts=[
            ServicePartCreate(
                description="Pastilha de freio", quantity=2, unit_price=50.0
            ),
            ServicePartCreate(
                description="Disco de freio", quantity=1, unit_price=100.0
            ),
        ],
        labor_description="Mão de obra",
        labor_cost=80.0,
        service_type="brake_service",
        current_mileage=15000,
    )

    assert completed.status == "completed"
    assert completed.final_cost == 280.0

    part_rows = g["session"].query(ServicePart).all()
    assert len(part_rows) == 2
    assert {float(row.total_price) for row in part_rows} == {100.0}
    assert all(row.tenant_id == g["tenant"].id for row in part_rows)
    assert all(row.service_order_id == g["service"].id for row in part_rows)
    assert all(
        row.description in {"Pastilha de freio", "Disco de freio"} for row in part_rows
    )

    history_rows = g["session"].query(ServiceHistory).all()
    assert len(history_rows) == 1
    row = history_rows[0]
    assert row.service_order_id == g["service"].id
    assert float(row.parts_cost) == 200.0
    assert float(row.labor_cost) == 80.0
    assert row.labor_description == "Mão de obra"


def test_completion_without_parts_keeps_estimated_cost_fallback():
    g = seed_graph()

    completed = complete_order(
        g["session"],
        g["tenant"],
        g["workshop_user"],
        g["service"],
        workshop_notes="All good",
    )

    assert completed.status == "completed"
    assert completed.final_cost == 120.0
    assert g["session"].query(ServicePart).count() == 0


def test_completion_with_negative_unit_price_rejected():
    g = seed_graph()

    with pytest.raises(ValidationError):
        ServiceActionUpdate(
            parts=[
                ServicePartCreate(
                    description="Pastilha de freio", quantity=1, unit_price=-5.0
                )
            ],
        )

    assert g["session"].query(ServicePart).count() == 0


def test_breakdown_access_client_and_workshop_and_cross_tenant():
    g = seed_graph()
    complete_order(
        g["session"],
        g["tenant"],
        g["workshop_user"],
        g["service"],
        parts=[
            ServicePartCreate(
                description="Pastilha de freio", quantity=2, unit_price=50.0
            ),
        ],
        labor_description="Mão de obra",
        labor_cost=80.0,
        service_type="brake_service",
        current_mileage=15000,
    )
    service_service = ServiceService(g["session"])

    client_view = service_service.get_service_order_breakdown(
        service_id=g["service"].id,
        user_id=g["client_user"].id,
        tenant_id=g["tenant"].id,
        role="CLIENT",
        user_email=g["client_user"].email,
    )
    assert client_view is not None
    assert len(client_view.parts) == 1
    assert client_view.parts[0].description == "Pastilha de freio"
    assert client_view.parts[0].total_price == 100.0
    assert client_view.parts_cost == 100.0
    assert client_view.labor_cost == 80.0
    assert client_view.final_cost == 180.0

    workshop_view = service_service.get_service_order_breakdown(
        service_id=g["service"].id,
        user_id=g["workshop_user"].id,
        tenant_id=g["tenant"].id,
        role="WORKSHOP",
    )
    assert workshop_view is not None
    assert len(workshop_view.parts) == 1

    foreign_view = service_service.get_service_order_breakdown(
        service_id=g["service"].id,
        user_id=g["workshop_user"].id,
        tenant_id=uuid.uuid4(),
        role="WORKSHOP",
    )
    assert foreign_view is None
