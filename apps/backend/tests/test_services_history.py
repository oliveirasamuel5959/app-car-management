import uuid
from datetime import datetime

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from src.db.base import Base
from src.models import Tenant, User, Vehicle, Workshop, WorkshopClient
from src.models.services import Service
from src.models.services_history import ServiceHistory
from src.schemas.services import ServiceActionUpdate
from src.schemas.services_history import ServiceHistoryCreate, ServiceHistoryUpdate
from src.services.services import ServiceService
from src.services.services_history import (
    ServiceHistoryReadOnlyError,
    ServiceHistoryService,
)


def build_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def seed_graph(second_workshop: bool = False):
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

    entities = {
        "session": session,
        "tenant": tenant,
        "workshop_user": workshop_user,
        "client_user": client_user,
        "workshop": workshop,
        "vehicle": vehicle,
        "service": service,
    }

    if second_workshop:
        # Workshops are 1:1 with tenants (uq_workshops_tenant_id), so a second
        # workshop necessarily lives in its own tenant with its own vehicle.
        other_tenant = Tenant(id=uuid.uuid4(), slug="tenant-b", name="Tenant B")
        session.add(other_tenant)
        session.commit()

        other_workshop_user = User(
            id=3,
            tenant_id=other_tenant.id,
            name="Other Workshop Owner",
            age=40,
            sex="M",
            email="other-workshop@test.dev",
            password_hash="hashed",
            role="WORKSHOP",
            is_active=True,
        )
        session.add(other_workshop_user)
        session.commit()

        other_workshop = Workshop(
            id=2,
            tenant_id=other_tenant.id,
            user_id=other_workshop_user.id,
            name="Other Workshop",
            email="other-workshop-profile@test.dev",
            description="desc",
            latitude=11,
            longitude=21,
            rating_avg=3.9,
        )
        other_vehicle = Vehicle(
            id=2,
            tenant_id=other_tenant.id,
            brand="Toyota",
            model="Corolla",
            year=2019,
            plate="BBB-0002",
            user_id=client_user.id,
        )
        session.add_all([other_workshop, other_vehicle])
        session.commit()

        entities["other_tenant"] = other_tenant
        entities["other_workshop_user"] = other_workshop_user
        entities["other_workshop"] = other_workshop
        entities["other_vehicle"] = other_vehicle

    return entities


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


def test_manual_create_forces_workshop_id_null_and_status_completed():
    g = seed_graph()

    record = ServiceHistoryService(g["session"]).create_service_history(
        ServiceHistoryCreate(
            vehicle_id=g["vehicle"].id,
            service_type="oil_change",
            current_mileage=10000,
            serviced_at=datetime(2026, 6, 1, 10, 0, 0),
        ),
        user_id=g["client_user"].id,
        tenant_id=g["tenant"].id,
    )

    assert record.workshop_id is None
    assert record.status == "completed"


def test_completion_auto_creates_history_when_fields_present():
    g = seed_graph()

    completed = complete_order(
        g["session"],
        g["tenant"],
        g["workshop_user"],
        g["service"],
        service_type="oil_change",
        current_mileage=15000,
        labor_cost=100.0,
        parts_cost=50.0,
        invoice_number="INV-1",
        warranty_until_date=datetime(2027, 6, 1),
        warranty_mileage=25000,
    )

    assert completed.status == "completed"

    history_rows = g["session"].query(ServiceHistory).all()
    assert len(history_rows) == 1
    row = history_rows[0]
    assert row.workshop_id == g["workshop"].id
    assert row.status == "completed"
    assert row.vehicle_id == g["vehicle"].id
    assert row.service_type == "oil_change"
    assert row.current_mileage == 15000
    assert float(row.labor_cost) == 100.0
    assert float(row.parts_cost) == 50.0
    assert row.invoice_number == "INV-1"
    assert row.warranty_mileage == 25000
    assert row.next_service_mileage is not None
    assert row.next_service_date is not None


def test_completion_skips_history_without_service_type_or_mileage():
    g = seed_graph()

    completed = complete_order(
        g["session"],
        g["tenant"],
        g["workshop_user"],
        g["service"],
        workshop_notes="All good",
    )

    assert completed.status == "completed"
    assert g["session"].query(ServiceHistory).count() == 0


def test_completion_skips_history_when_vehicle_id_is_null():
    g = seed_graph()
    g["service"].vehicle_id = None
    g["session"].commit()

    completed = complete_order(
        g["session"],
        g["tenant"],
        g["workshop_user"],
        g["service"],
        service_type="oil_change",
        current_mileage=15000,
    )

    assert completed.status == "completed"
    assert g["session"].query(ServiceHistory).count() == 0


def test_workshop_scoped_list_excludes_other_workshops_and_manual_entries():
    g = seed_graph(second_workshop=True)

    complete_order(
        g["session"],
        g["tenant"],
        g["workshop_user"],
        g["service"],
        service_type="oil_change",
        current_mileage=15000,
    )

    # Manual client entry (workshop_id must be null / excluded from workshop view)
    ServiceHistoryService(g["session"]).create_service_history(
        ServiceHistoryCreate(
            vehicle_id=g["vehicle"].id,
            service_type="tire_rotation",
            current_mileage=16000,
            serviced_at=datetime(2026, 6, 5, 10, 0, 0),
        ),
        user_id=g["client_user"].id,
        tenant_id=g["tenant"].id,
    )

    # Another workshop's own auto-created row, in its own tenant
    other_history_service = ServiceHistoryService(g["session"])
    other_history_service.create_service_history_from_completion(
        tenant_id=g["other_tenant"].id,
        workshop_id=g["other_workshop"].id,
        vehicle_id=g["other_vehicle"].id,
        service_type="brake_service",
        current_mileage=17000,
        serviced_at=datetime(2026, 6, 6, 10, 0, 0),
    )

    results = ServiceHistoryService(g["session"]).get_services_history_for_workshop(
        tenant_id=g["tenant"].id,
        user_id=g["workshop_user"].id,
    )

    assert len(results) == 1
    assert results[0].workshop_id == g["workshop"].id
    assert results[0].service_type == "oil_change"


def test_client_cannot_update_workshop_authored_row():
    g = seed_graph()
    complete_order(
        g["session"],
        g["tenant"],
        g["workshop_user"],
        g["service"],
        service_type="oil_change",
        current_mileage=15000,
    )
    row = g["session"].query(ServiceHistory).one()

    with pytest.raises(ServiceHistoryReadOnlyError):
        ServiceHistoryService(g["session"]).update_service_history(
            history_id=row.id,
            history_in=ServiceHistoryUpdate(description="edited"),
            tenant_id=g["tenant"].id,
            user_id=g["client_user"].id,
        )


def test_client_cannot_delete_workshop_authored_row():
    g = seed_graph()
    complete_order(
        g["session"],
        g["tenant"],
        g["workshop_user"],
        g["service"],
        service_type="oil_change",
        current_mileage=15000,
    )
    row = g["session"].query(ServiceHistory).one()

    with pytest.raises(ServiceHistoryReadOnlyError):
        ServiceHistoryService(g["session"]).delete_service_history(
            history_id=row.id,
            tenant_id=g["tenant"].id,
            user_id=g["client_user"].id,
        )


def test_client_can_still_edit_and_delete_manual_row():
    g = seed_graph()
    record = ServiceHistoryService(g["session"]).create_service_history(
        ServiceHistoryCreate(
            vehicle_id=g["vehicle"].id,
            service_type="oil_change",
            current_mileage=10000,
            serviced_at=datetime(2026, 6, 1, 10, 0, 0),
        ),
        user_id=g["client_user"].id,
        tenant_id=g["tenant"].id,
    )

    updated = ServiceHistoryService(g["session"]).update_service_history(
        history_id=record.id,
        history_in=ServiceHistoryUpdate(description="updated description"),
        tenant_id=g["tenant"].id,
        user_id=g["client_user"].id,
    )
    assert updated.description == "updated description"

    deleted = ServiceHistoryService(g["session"]).delete_service_history(
        history_id=record.id,
        tenant_id=g["tenant"].id,
        user_id=g["client_user"].id,
    )
    assert deleted is True
    assert g["session"].query(ServiceHistory).count() == 0
