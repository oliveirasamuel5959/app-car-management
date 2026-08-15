import uuid

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from src.db.base import Base
from src.models import Tenant, User, Workshop
from src.models.workshop_rating import WorkshopRating
from src.models.workshop_service import WorkshopService as WorkshopServiceModel
from src.schemas.workshop import WorkshopSearchItem
from src.services.workshop import WorkshopService
from src.utils.workshops import haversine_km

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


def seed_search_graph():
    """Two tenants, two workshops with different ratings and catalogs.

    Workshop A: rating 4.0, catalog {manutencao, reparo}, at (0, 0),
                2 received ratings.
    Workshop B: rating 2.0, catalog {inspecao}, at (0.089, 0.05)
                (~11.3 km from origin — inside a 10 km bounding box,
                outside the true radius), 0 ratings.
    """
    session = build_session()

    tenant_a = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant_a)
    session.commit()

    tenant_b = Tenant(id=uuid.uuid4(), slug="tenant-b", name="Tenant B")
    session.add(tenant_b)
    session.commit()

    user_a = User(
        tenant_id=tenant_a.id,
        name="Owner A",
        age=35,
        sex="M",
        email="owner-a@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    user_b = User(
        tenant_id=tenant_b.id,
        name="Owner B",
        age=40,
        sex="M",
        email="owner-b@test.dev",
        password_hash="hashed",
        role="WORKSHOP",
        is_active=True,
    )
    session.add_all([user_a, user_b])
    session.commit()

    workshop_a = Workshop(
        tenant_id=tenant_a.id,
        user_id=user_a.id,
        name="Workshop A",
        email="a@test.dev",
        description="Highly rated",
        latitude=0.0,
        longitude=0.0,
        rating_avg=4.0,
        phone="111111111",
        address="Rua A",
        city="City A",
        state="SA",
        logo_url="http://logo/a.png",
    )
    workshop_b = Workshop(
        tenant_id=tenant_b.id,
        user_id=user_b.id,
        name="Workshop B",
        email="b@test.dev",
        description="Less rated",
        latitude=0.089,
        longitude=0.05,
        rating_avg=2.0,
    )
    session.add_all([workshop_a, workshop_b])
    session.commit()
    session.refresh(workshop_a)
    session.refresh(workshop_b)

    session.add_all(
        [
            WorkshopServiceModel(
                workshop_id=workshop_a.id,
                tenant_id=tenant_a.id,
                service_type="manutencao",
            ),
            WorkshopServiceModel(
                workshop_id=workshop_a.id,
                tenant_id=tenant_a.id,
                service_type="reparo",
            ),
            WorkshopServiceModel(
                workshop_id=workshop_b.id,
                tenant_id=tenant_b.id,
                service_type="inspecao",
            ),
        ]
    )
    session.add_all(
        [
            WorkshopRating(
                workshop_tenant_id=tenant_a.id,
                client_tenant_id=tenant_b.id,
                schedule_id=None,
                rating=5,
            ),
            WorkshopRating(
                workshop_tenant_id=tenant_a.id,
                client_tenant_id=tenant_b.id,
                schedule_id=None,
                rating=3,
            ),
        ]
    )
    session.commit()

    return session, tenant_a, tenant_b, workshop_a, workshop_b


def names(items):
    return [i.name for i in items]


# ---------------------------------------------------------------------------
# Haversine
# ---------------------------------------------------------------------------


def test_haversine_known_pair():
    # One degree of longitude at the equator is ~111.19 km
    assert abs(haversine_km(0.0, 0.0, 0.0, 1.0) - 111.19) < 0.5
    assert haversine_km(0.0, 0.0, 0.0, 0.0) == 0.0


# ---------------------------------------------------------------------------
# min_rating filter
# ---------------------------------------------------------------------------


def test_min_rating_filter():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    results = service.search_workshops(min_rating=3.0)
    assert names(results) == ["Workshop A"]

    results = service.search_workshops(min_rating=0.0)
    assert len(results) == 2


# ---------------------------------------------------------------------------
# service_types filter (OR semantics)
# ---------------------------------------------------------------------------


def test_service_types_filter_or_semantics():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    results = service.search_workshops(service_types=["manutencao"])
    assert names(results) == ["Workshop A"]

    results = service.search_workshops(service_types=["inspecao"])
    assert names(results) == ["Workshop B"]

    results = service.search_workshops(service_types=["manutencao", "inspecao"])
    assert sorted(names(results)) == ["Workshop A", "Workshop B"]

    results = service.search_workshops(service_types=["outro"])
    assert results == []


def test_invalid_service_type_raises():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    with pytest.raises(ValueError):
        service.search_workshops(service_types=["limpeza"])


# ---------------------------------------------------------------------------
# Sorting
# ---------------------------------------------------------------------------


def test_sort_by_rating():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    results = service.search_workshops(sort="rating")
    assert names(results) == ["Workshop A", "Workshop B"]


def test_sort_by_reviews():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    results = service.search_workshops(sort="reviews")
    assert names(results) == ["Workshop A", "Workshop B"]  # 2 ratings vs 0


def test_sort_by_distance():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    results = service.search_workshops(
        lat=0.0, lng=0.0, radius_km=100.0, sort="distance"
    )
    assert names(results) == ["Workshop A", "Workshop B"]


def test_sort_distance_without_coords_raises():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    with pytest.raises(ValueError):
        service.search_workshops(sort="distance")


# ---------------------------------------------------------------------------
# Distance field
# ---------------------------------------------------------------------------


def test_distance_present_with_coords_and_none_without():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    with_coords = service.search_workshops(lat=0.0, lng=0.0, radius_km=100.0)
    a = next(i for i in with_coords if i.name == "Workshop A")
    b = next(i for i in with_coords if i.name == "Workshop B")
    assert a.distance_km is not None and a.distance_km == pytest.approx(0.0, abs=1e-6)
    assert b.distance_km is not None and b.distance_km == pytest.approx(11.33, abs=0.1)

    without_coords = service.search_workshops()
    assert all(i.distance_km is None for i in without_coords)


def test_radius_filters_by_exact_distance():
    # Workshop B sits inside the 10 km bounding box but ~11.3 km away;
    # the Haversine post-filter must exclude it.
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    results = service.search_workshops(lat=0.0, lng=0.0, radius_km=10.0)
    assert names(results) == ["Workshop A"]

    results = service.search_workshops(lat=0.0, lng=0.0, radius_km=100.0)
    assert sorted(names(results)) == ["Workshop A", "Workshop B"]


# ---------------------------------------------------------------------------
# Pagination after sorting
# ---------------------------------------------------------------------------


def test_pagination_applied_after_sorting():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    first = service.search_workshops(sort="rating", skip=0, limit=1)
    second = service.search_workshops(sort="rating", skip=1, limit=1)
    assert names(first) == ["Workshop A"]
    assert names(second) == ["Workshop B"]


# ---------------------------------------------------------------------------
# Response shape
# ---------------------------------------------------------------------------


def test_search_item_shape_omits_tenant_and_owner_fields():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    results = service.search_workshops(service_types=["manutencao"])
    item = results[0]

    assert item.name == "Workshop A"
    assert item.rating_avg == 4.0
    assert item.service_types == ["manutencao", "reparo"]
    assert item.ratings_count == 2
    assert item.city == "City A"
    assert item.address == "Rua A"
    assert item.phone == "111111111"
    assert item.logo_url == "http://logo/a.png"

    dumped = WorkshopSearchItem.model_validate(item).model_dump()
    for forbidden in ("tenant_id", "user_id", "email", "opening_time", "work_days"):
        assert forbidden not in dumped


def test_name_filter_still_works():
    session, tenant_a, tenant_b, workshop_a, workshop_b = seed_search_graph()
    service = WorkshopService(session)

    assert names(service.search_workshops(name="workshop b")) == ["Workshop B"]
