import uuid
from datetime import datetime, time

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from src.db.base import Base
from src.models import Notification, Tenant, User, Vehicle, Workshop
from src.models.workshop_rating import WorkshopRating
from src.repositories.workshop_rating import (
    repo_average_for_workshop_tenant, repo_get_rating_by_id,
    repo_get_rating_by_schedule, repo_list_ratings_for_client_tenant,
    repo_list_ratings_for_workshop_tenant)
from src.schemas.workshop_rating import WorkshopRatingCreate
from src.services.notifications import NotificationService
from src.services.schedules import ScheduleService
from src.services.workshop_rating import WorkshopRatingService

# ---------------------------------------------------------------------------
# Test infrastructure
# ---------------------------------------------------------------------------


def build_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)()


def seed_rating_graph():
    """Create two tenants, a workshop in tenant A, and a client user in tenant B."""
    session = build_session()

    tenant_a = Tenant(id=uuid.uuid4(), slug="workshop-tenant", name="Workshop Tenant")
    session.add(tenant_a)
    session.commit()

    tenant_b = Tenant(id=uuid.uuid4(), slug="client-tenant", name="Client Tenant")
    session.add(tenant_b)
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


def make_accepted_schedule(
    session, tenant_a, tenant_b, workshop, vehicle, day=1, hour=10
):
    """Create and accept a schedule on the given date."""
    service = ScheduleService(session)
    schedule = service.create_schedule(
        {
            "workshop_id": workshop.id,
            "workshop_tenant_id": tenant_a.id,
            "vehicle_id": vehicle.id,
            "service_request_type": "manutencao",
            "problem_description": "Rating test",
            "contact_phone": "11999999999",
            "contact_email": "client@test.dev",
            "scheduled_at": datetime(2026, 8, day, hour, 0, 0),
        },
        client_tenant_id=tenant_b.id,
    )
    return service.accept_schedule(schedule.id, tenant_a.id)


# ---------------------------------------------------------------------------
# Case 1 — Create on an aceito schedule → row with both tenant ids
# ---------------------------------------------------------------------------


def test_create_rating_on_accepted_schedule():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()
    schedule = make_accepted_schedule(
        session, tenant_a, tenant_b, workshop, vehicle, day=1
    )

    service = WorkshopRatingService(session)
    rating = service.create_rating(
        {"schedule_id": schedule.id, "rating": 4, "comment": "Ótimo serviço"},
        client_tenant_id=tenant_b.id,
    )

    assert rating.schedule_id == schedule.id
    assert rating.workshop_tenant_id == tenant_a.id
    assert rating.client_tenant_id == tenant_b.id
    assert rating.rating == 4
    assert rating.comment == "Ótimo serviço"
    assert rating.created_at is not None


# ---------------------------------------------------------------------------
# Case 2 — Create on pendente/visualizado/recusado raises ValueError
# ---------------------------------------------------------------------------


def test_create_rating_rejected_for_non_accepted_schedule():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()
    schedule_service = ScheduleService(session)

    pendente = schedule_service.create_schedule(
        {
            "workshop_id": workshop.id,
            "workshop_tenant_id": tenant_a.id,
            "vehicle_id": vehicle.id,
            "service_request_type": "manutencao",
            "problem_description": "Pendente",
            "contact_phone": "11999999999",
            "contact_email": "client@test.dev",
            "scheduled_at": datetime(2026, 8, 1, 10, 0, 0),
        },
        client_tenant_id=tenant_b.id,
    )
    visualizado = schedule_service.create_schedule(
        {
            "workshop_id": workshop.id,
            "workshop_tenant_id": tenant_a.id,
            "vehicle_id": vehicle.id,
            "service_request_type": "reparo",
            "problem_description": "Visualizado",
            "contact_phone": "11999999999",
            "contact_email": "client@test.dev",
            "scheduled_at": datetime(2026, 8, 2, 10, 0, 0),
        },
        client_tenant_id=tenant_b.id,
    )
    schedule_service.view_schedule(visualizado.id, tenant_a.id)

    recusado = schedule_service.create_schedule(
        {
            "workshop_id": workshop.id,
            "workshop_tenant_id": tenant_a.id,
            "vehicle_id": vehicle.id,
            "service_request_type": "inspecao",
            "problem_description": "Recusado",
            "contact_phone": "11999999999",
            "contact_email": "client@test.dev",
            "scheduled_at": datetime(2026, 8, 3, 10, 0, 0),
        },
        client_tenant_id=tenant_b.id,
    )
    schedule_service.reject_schedule(recusado.id, tenant_a.id)

    service = WorkshopRatingService(session)
    for schedule in (pendente, visualizado, recusado):
        with pytest.raises(ValueError):
            service.create_rating(
                {"schedule_id": schedule.id, "rating": 4},
                client_tenant_id=tenant_b.id,
            )


# ---------------------------------------------------------------------------
# Case 3 — Duplicate rating for the same schedule raises ValueError
# ---------------------------------------------------------------------------


def test_duplicate_rating_for_schedule_rejected():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()
    schedule = make_accepted_schedule(
        session, tenant_a, tenant_b, workshop, vehicle, day=1
    )

    service = WorkshopRatingService(session)
    service.create_rating(
        {"schedule_id": schedule.id, "rating": 4},
        client_tenant_id=tenant_b.id,
    )

    with pytest.raises(ValueError):
        service.create_rating(
            {"schedule_id": schedule.id, "rating": 2},
            client_tenant_id=tenant_b.id,
        )


# ---------------------------------------------------------------------------
# Case 4 — rating outside 0–5 → Pydantic ValidationError
# ---------------------------------------------------------------------------


def test_rating_schema_validates_range():
    with pytest.raises(ValidationError):
        WorkshopRatingCreate(schedule_id=1, rating=6)
    with pytest.raises(ValidationError):
        WorkshopRatingCreate(schedule_id=1, rating=-1)

    # Boundaries are valid
    assert WorkshopRatingCreate(schedule_id=1, rating=0).rating == 0
    assert WorkshopRatingCreate(schedule_id=1, rating=5).rating == 5


# ---------------------------------------------------------------------------
# Case 5 — Update own rating → fields change and rating_avg recomputes
# ---------------------------------------------------------------------------


def test_update_own_rating_recomputes_avg():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()
    schedule = make_accepted_schedule(
        session, tenant_a, tenant_b, workshop, vehicle, day=1
    )

    service = WorkshopRatingService(session)
    rating = service.create_rating(
        {"schedule_id": schedule.id, "rating": 2},
        client_tenant_id=tenant_b.id,
    )
    assert workshop.rating_avg == 2.0

    updated = service.update_rating(
        rating.id, {"rating": 5}, client_tenant_id=tenant_b.id
    )
    assert updated.rating == 5
    assert updated.comment is None
    session.refresh(workshop)
    assert workshop.rating_avg == 5.0

    # Comment-only update does not touch the average
    commented = service.update_rating(
        rating.id, {"comment": "Excelente"}, client_tenant_id=tenant_b.id
    )
    assert commented.comment == "Excelente"
    session.refresh(workshop)
    assert workshop.rating_avg == 5.0


# ---------------------------------------------------------------------------
# Case 6 — Delete own rating → row removed and rating_avg recomputes
# ---------------------------------------------------------------------------


def test_delete_own_rating_recomputes_avg():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()
    schedule = make_accepted_schedule(
        session, tenant_a, tenant_b, workshop, vehicle, day=1
    )

    service = WorkshopRatingService(session)
    rating = service.create_rating(
        {"schedule_id": schedule.id, "rating": 3},
        client_tenant_id=tenant_b.id,
    )
    session.refresh(workshop)
    assert workshop.rating_avg == 3.0

    service.delete_rating(rating.id, client_tenant_id=tenant_b.id)

    assert session.query(WorkshopRating).count() == 0
    session.refresh(workshop)
    assert workshop.rating_avg == 0.0


# ---------------------------------------------------------------------------
# Case 7 — Cross-tenant lists and single-gets return empty/None
# ---------------------------------------------------------------------------


def test_cross_tenant_lists_and_get_return_empty():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()
    schedule = make_accepted_schedule(
        session, tenant_a, tenant_b, workshop, vehicle, day=1
    )

    service = WorkshopRatingService(session)
    rating = service.create_rating(
        {"schedule_id": schedule.id, "rating": 4},
        client_tenant_id=tenant_b.id,
    )

    # Right tenants see it
    assert any(r.id == rating.id for r in service.get_ratings_for_client(tenant_b.id))
    assert any(r.id == rating.id for r in service.get_ratings_for_workshop(tenant_a.id))

    # Wrong tenants see nothing
    assert repo_list_ratings_for_client_tenant(session, uuid.uuid4()) == []
    assert repo_list_ratings_for_workshop_tenant(session, uuid.uuid4()) == []
    assert repo_get_rating_by_id(session, rating.id, uuid.uuid4()) is None

    # Public list for an unknown workshop raises
    with pytest.raises(ValueError):
        service.get_ratings_for_workshop_public(999999)


# ---------------------------------------------------------------------------
# Case 8 — repo_* called without tenant id raises TypeError
# ---------------------------------------------------------------------------


def test_repo_without_tenant_raises_typeerror():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()

    with pytest.raises(TypeError):
        repo_list_ratings_for_client_tenant(session, None)
    with pytest.raises(TypeError):
        repo_list_ratings_for_workshop_tenant(session, None)
    with pytest.raises(TypeError):
        repo_get_rating_by_id(session, 1, None)
    with pytest.raises(TypeError):
        repo_get_rating_by_schedule(session, 1, None)
    with pytest.raises(TypeError):
        repo_average_for_workshop_tenant(session, None)


# ---------------------------------------------------------------------------
# Case 9 — Workshop or foreign client cannot write
# ---------------------------------------------------------------------------


def test_workshop_or_foreign_client_cannot_write():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()
    schedule = make_accepted_schedule(
        session, tenant_a, tenant_b, workshop, vehicle, day=1
    )

    service = WorkshopRatingService(session)

    # Workshop tenant cannot create: it does not own the schedule as a client
    with pytest.raises(ValueError):
        service.create_rating(
            {"schedule_id": schedule.id, "rating": 4},
            client_tenant_id=tenant_a.id,
        )

    rating = service.create_rating(
        {"schedule_id": schedule.id, "rating": 4},
        client_tenant_id=tenant_b.id,
    )

    # Workshop tenant cannot update/delete
    with pytest.raises(ValueError):
        service.update_rating(rating.id, {"rating": 1}, client_tenant_id=tenant_a.id)
    with pytest.raises(ValueError):
        service.delete_rating(rating.id, client_tenant_id=tenant_a.id)

    # A foreign client tenant cannot update/delete either
    with pytest.raises(ValueError):
        service.update_rating(rating.id, {"rating": 1}, client_tenant_id=uuid.uuid4())
    with pytest.raises(ValueError):
        service.delete_rating(rating.id, client_tenant_id=uuid.uuid4())


# ---------------------------------------------------------------------------
# Case 10 — Average math: recompute on create and delete
# ---------------------------------------------------------------------------


def test_average_recompute_math():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()
    schedule_1 = make_accepted_schedule(
        session, tenant_a, tenant_b, workshop, vehicle, day=1
    )
    schedule_2 = make_accepted_schedule(
        session, tenant_a, tenant_b, workshop, vehicle, day=2
    )

    service = WorkshopRatingService(session)
    rating_2 = service.create_rating(
        {"schedule_id": schedule_1.id, "rating": 2},
        client_tenant_id=tenant_b.id,
    )
    service.create_rating(
        {"schedule_id": schedule_2.id, "rating": 4},
        client_tenant_id=tenant_b.id,
    )

    session.refresh(workshop)
    assert workshop.rating_avg == 3.0

    # Delete the 2-star rating → average becomes the remaining 4
    service.delete_rating(rating_2.id, client_tenant_id=tenant_b.id)
    session.refresh(workshop)
    assert workshop.rating_avg == 4.0

    # Delete the last rating → average falls back to 0.0
    remaining = session.query(WorkshopRating).first()
    service.delete_rating(remaining.id, client_tenant_id=tenant_b.id)
    session.refresh(workshop)
    assert workshop.rating_avg == 0.0


# ---------------------------------------------------------------------------
# Case 11 — New rating notifies the workshop user (schedule_id linked)
# ---------------------------------------------------------------------------


def test_new_rating_notifies_workshop():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()
    schedule = make_accepted_schedule(
        session, tenant_a, tenant_b, workshop, vehicle, day=1
    )

    service = WorkshopRatingService(session)
    rating = service.create_rating(
        {"schedule_id": schedule.id, "rating": 5},
        client_tenant_id=tenant_b.id,
    )

    # Route-level wiring: the route calls this after create_rating succeeds
    notif_service = NotificationService(session)
    notif_service.create_rating_notification(
        tenant_id=tenant_a.id,
        user_id=w_user.id,
        schedule_id=rating.schedule_id,
        rating_value=rating.rating,
    )
    session.commit()

    notifs = (
        session.query(Notification)
        .filter(Notification.schedule_id == schedule.id)
        .all()
    )
    assert len(notifs) == 1
    assert notifs[0].user_id == w_user.id
    assert notifs[0].notification_type == "rating_new"
    assert notifs[0].title == "Nova Avaliação"


# ---------------------------------------------------------------------------
# Case 12 — API serialization attaches the author's full name
# ---------------------------------------------------------------------------


def test_rating_read_dict_includes_client_name():
    session, tenant_a, tenant_b, w_user, c_user, workshop, vehicle = seed_rating_graph()
    schedule = make_accepted_schedule(
        session, tenant_a, tenant_b, workshop, vehicle, day=1
    )

    service = WorkshopRatingService(session)
    rating = service.create_rating(
        {"schedule_id": schedule.id, "rating": 4, "comment": "Bom serviço"},
        client_tenant_id=tenant_b.id,
    )

    data = service.to_read_dict(rating)
    assert data["client_name"] == "Client User"
    assert data["rating"] == 4
    assert data["schedule_id"] == schedule.id
    assert data["comment"] == "Bom serviço"


# ---------------------------------------------------------------------------
# Order-anchored reviews (paid service orders) — Phase 6
# ---------------------------------------------------------------------------


def seed_paid_order_graph():
    """Single-tenant graph: workshop + client in tenant A with a paid order."""
    session = build_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant)
    session.commit()

    workshop_user = User(
        tenant_id=tenant.id,
        name="Workshop Owner",
        age=35,
        sex="M",
        email="workshop@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    client_user = User(
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
        rating_avg=0.0,
    )
    vehicle = Vehicle(
        tenant_id=tenant.id,
        brand="Honda",
        model="Civic",
        year=2020,
        plate="AAA-0001",
        user_id=client_user.id,
    )
    from src.models.workshop_client import WorkshopClient

    workshop_client = WorkshopClient(
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

    from src.models.services import Service

    service = Service(
        tenant_id=tenant.id,
        workshop_id=workshop.id,
        vehicle_id=vehicle.id,
        workshop_client_id=workshop_client.id,
        name="Troca de óleo",
        status="paid",
        checkin_date=datetime(2026, 8, 10, 9, 0),
        estimated_cost=100.0,
        final_cost=100.0,
    )
    session.add(service)
    session.commit()
    session.refresh(service)
    return session, tenant, workshop_user, client_user, workshop, service


def _order_rating_payload(service_id):
    return {"service_order_id": service_id, "rating": 5, "comment": "Excelente"}


def test_order_rating_requires_paid_order():
    session, tenant, w_user, c_user, workshop, service = seed_paid_order_graph()
    service.status = "completed"
    session.commit()

    with pytest.raises(ValueError, match="pagos"):
        WorkshopRatingService(session).create_rating(
            _order_rating_payload(service.id),
            client_tenant_id=tenant.id,
            client_user_id=c_user.id,
            client_email=c_user.email,
        )


def test_order_rating_rejects_unowned_order():
    session, tenant, w_user, c_user, workshop, service = seed_paid_order_graph()

    with pytest.raises(ValueError, match="não encontrado"):
        WorkshopRatingService(session).create_rating(
            _order_rating_payload(service.id),
            client_tenant_id=tenant.id,
            client_user_id=999,
            client_email="stranger@test.dev",
        )


def test_order_rating_creates_for_paid_order_and_recomputes_avg():
    session, tenant, w_user, c_user, workshop, service = seed_paid_order_graph()

    rating = WorkshopRatingService(session).create_rating(
        _order_rating_payload(service.id),
        client_tenant_id=tenant.id,
        client_user_id=c_user.id,
        client_email=c_user.email,
    )

    assert rating.service_order_id == service.id
    assert rating.schedule_id is None
    assert rating.workshop_tenant_id == tenant.id
    assert rating.client_tenant_id == tenant.id
    session.refresh(workshop)
    assert workshop.rating_avg == 5.0

    data = WorkshopRatingService(session).to_read_dict(rating)
    assert data["service_order_id"] == service.id


def test_order_rating_rejects_duplicate_for_same_order():
    session, tenant, w_user, c_user, workshop, service = seed_paid_order_graph()
    rating_service = WorkshopRatingService(session)
    rating_service.create_rating(
        _order_rating_payload(service.id),
        client_tenant_id=tenant.id,
        client_user_id=c_user.id,
        client_email=c_user.email,
    )

    with pytest.raises(ValueError, match="Já existe"):
        rating_service.create_rating(
            _order_rating_payload(service.id),
            client_tenant_id=tenant.id,
            client_user_id=c_user.id,
            client_email=c_user.email,
        )


def test_order_rating_requires_exactly_one_anchor():
    session, tenant, w_user, c_user, workshop, service = seed_paid_order_graph()
    rating_service = WorkshopRatingService(session)

    with pytest.raises(ValueError, match="apenas um"):
        rating_service.create_rating(
            {
                "schedule_id": 1,
                "service_order_id": service.id,
                "rating": 5,
                "comment": None,
            },
            client_tenant_id=tenant.id,
            client_user_id=c_user.id,
            client_email=c_user.email,
        )
    with pytest.raises(ValueError, match="apenas um"):
        rating_service.create_rating(
            {"rating": 5, "comment": None},
            client_tenant_id=tenant.id,
            client_user_id=c_user.id,
            client_email=c_user.email,
        )
