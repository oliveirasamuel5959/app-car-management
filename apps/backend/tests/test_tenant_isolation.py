import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy import event
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import sessionmaker

from src.core.security import create_access_token, hash_password, verify_token
from src.core.tenant import TenantContext
from src.db.base import Base
from src.models import Message, Notification, Tenant, User, Vehicle, Workshop, WorkshopClient
from src.models.services import Service
from src.repositories.services import repo_get_services_by_user_id
from src.repositories.user import repo_get_user_by_id
from src.repositories.vehicle import repo_get_vehicles_by_user_id
from src.repositories.workshop import repo_get_workshop_for_user
from src.schemas.workshop_client import WorkshopClientCreate
from src.services.messages import MessageService
from src.services.user import UserService
from src.services.workshop_client import WorkshopClientService


def build_session():
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False, autocommit=False)()
    return session


def create_user(session, *, tenant_id, email, user_id):
    user = User(
        id=user_id,
        tenant_id=tenant_id,
        name="Test User",
        age=30,
        sex="M",
        email=email,
        password_hash="hashed",
        role="CLIENT",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def create_user_with_password(session, *, tenant_id, email, user_id, password, role="CLIENT"):
    user = User(
        id=user_id,
        tenant_id=tenant_id,
        name="Test User",
        age=30,
        sex="M",
        email=email,
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def create_workshop(session, *, tenant_id, user_id, workshop_id, email=None):
    workshop = Workshop(
        id=workshop_id,
        tenant_id=tenant_id,
        user_id=user_id,
        name=f"Workshop {workshop_id}",
        email=email,
        description="desc",
        latitude=10.0,
        longitude=20.0,
        rating_avg=4.5,
    )
    session.add(workshop)
    session.commit()
    session.refresh(workshop)
    return workshop


def test_repo_get_user_by_id_rejects_cross_tenant_access():
    session = build_session()
    tenant_a = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    tenant_b = Tenant(id=uuid.uuid4(), slug="tenant-b", name="Tenant B")
    session.add_all([tenant_a, tenant_b])
    session.commit()

    user = create_user(session, tenant_id=tenant_a.id, email="user@a.test", user_id=1)

    assert repo_get_user_by_id(session, user.id, tenant_a.id) is not None
    assert repo_get_user_by_id(session, user.id, tenant_b.id) is None


def test_repo_get_vehicles_by_user_id_filters_by_tenant():
    session = build_session()
    tenant_a = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    tenant_b = Tenant(id=uuid.uuid4(), slug="tenant-b", name="Tenant B")
    session.add_all([tenant_a, tenant_b])
    session.commit()

    user_a = create_user(session, tenant_id=tenant_a.id, email="a@test.dev", user_id=1)
    user_b = create_user(session, tenant_id=tenant_b.id, email="b@test.dev", user_id=2)

    session.add_all(
        [
            Vehicle(tenant_id=tenant_a.id, brand="Honda", model="Civic", year=2020, plate="AAA-0001", user_id=user_a.id),
            Vehicle(tenant_id=tenant_b.id, brand="Ford", model="Focus", year=2021, plate="BBB-0002", user_id=user_b.id),
        ]
    )
    session.commit()

    tenant_a_vehicles = repo_get_vehicles_by_user_id(session, user_a.id, tenant_a.id)
    tenant_b_vehicles = repo_get_vehicles_by_user_id(session, user_a.id, tenant_b.id)

    assert len(tenant_a_vehicles) == 1
    assert tenant_a_vehicles[0].plate == "AAA-0001"
    assert tenant_b_vehicles == []


def test_access_token_includes_tenant_claims():
    tenant_id = uuid.uuid4()

    token = create_access_token(
        {
            "sub": "user@example.com",
            "user_id": 10,
            "role": "WORKSHOP",
            "tenant_id": str(tenant_id),
            "tenant_slug": "workshop-tenant",
        }
    )
    payload = verify_token(token)

    assert payload is not None
    assert payload["tenant_id"] == str(tenant_id)
    assert payload["tenant_slug"] == "workshop-tenant"
    assert payload["role"] == "WORKSHOP"


def test_repository_rejects_queries_without_tenant_id():
    session = build_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant)
    session.commit()
    user = create_user(session, tenant_id=tenant.id, email="user@test.dev", user_id=1)

    with pytest.raises(TypeError):
        repo_get_user_by_id(session, user.id)


def test_user_unique_email_is_scoped_per_tenant():
    session = build_session()
    tenant_a = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    tenant_b = Tenant(id=uuid.uuid4(), slug="tenant-b", name="Tenant B")
    session.add_all([tenant_a, tenant_b])
    session.commit()

    create_user(session, tenant_id=tenant_a.id, email="same@test.dev", user_id=1)
    create_user(session, tenant_id=tenant_b.id, email="same@test.dev", user_id=2)

    duplicate_user = User(
        id=3,
        tenant_id=tenant_a.id,
        name="Dup",
        age=28,
        sex="F",
        email="same@test.dev",
        password_hash="hashed",
        role="CLIENT",
        is_active=True,
    )
    session.add(duplicate_user)

    with pytest.raises(IntegrityError):
        session.commit()

    session.rollback()


def test_foreign_key_rejects_unknown_tenant_id():
    session = build_session()

    invalid_user = User(
        id=1,
        tenant_id=uuid.uuid4(),
        name="Bad",
        age=30,
        sex="M",
        email="bad@test.dev",
        password_hash="hashed",
        role="CLIENT",
        is_active=True,
    )
    session.add(invalid_user)

    with pytest.raises(IntegrityError):
        session.commit()

    session.rollback()


def test_model_relationships_expose_tenant_ownership():
    session = build_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant)
    session.commit()

    user = create_user(session, tenant_id=tenant.id, email="owner@test.dev", user_id=1)
    vehicle = Vehicle(tenant_id=tenant.id, brand="Honda", model="Civic", year=2020, plate="AAA-1111", user_id=user.id)
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)

    assert len(tenant.users) == 1
    assert tenant.users[0].id == user.id
    assert len(tenant.vehicles) == 1
    assert tenant.vehicles[0].id == vehicle.id
    assert user.tenant.id == tenant.id
    assert vehicle.tenant.id == tenant.id


def test_workshop_unique_constraints_are_tenant_scoped():
    session = build_session()
    tenant_a = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    tenant_b = Tenant(id=uuid.uuid4(), slug="tenant-b", name="Tenant B")
    session.add_all([tenant_a, tenant_b])
    session.commit()

    user_a = create_user(session, tenant_id=tenant_a.id, email="owner-a@test.dev", user_id=1)
    user_b = create_user(session, tenant_id=tenant_b.id, email="owner-b@test.dev", user_id=2)

    create_workshop(session, tenant_id=tenant_a.id, user_id=user_a.id, workshop_id=1, email="shop@test.dev")
    create_workshop(session, tenant_id=tenant_b.id, user_id=user_b.id, workshop_id=2, email="shop@test.dev")

    duplicate_same_tenant = Workshop(
        id=3,
        tenant_id=tenant_a.id,
        user_id=user_a.id,
        name="Duplicate Shop",
        email="shop@test.dev",
        description="dup",
        latitude=0,
        longitude=0,
        rating_avg=0,
    )
    session.add(duplicate_same_tenant)

    with pytest.raises(IntegrityError):
        session.commit()

    session.rollback()


def test_workshop_client_allows_unregistered_email_and_keeps_user_link_optional():
    session = build_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant)
    session.commit()

    workshop_owner = create_user(session, tenant_id=tenant.id, email="owner@test.dev", user_id=1)
    create_workshop(session, tenant_id=tenant.id, user_id=workshop_owner.id, workshop_id=1, email="shop@test.dev")

    service = WorkshopClientService(session)
    client = service.create_client(
        WorkshopClientCreate(
            name="Walk-in Client",
            email="walkin@test.dev",
            phone="5551999999999",
            vehicle_brand="Honda",
            vehicle_model="Civic",
            vehicle_year=2022,
            vehicle_plate="WKC-0001",
        ),
        user_id=workshop_owner.id,
        tenant_id=tenant.id,
    )

    assert client.email == "walkin@test.dev"
    assert client.user_id is None
    assert client.tenant_id == tenant.id


def test_login_user_selects_matching_password_across_tenants_without_tenant_slug():
    session = build_session()
    tenant_a = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    tenant_b = Tenant(id=uuid.uuid4(), slug="tenant-b", name="Tenant B")
    session.add_all([tenant_a, tenant_b])
    session.commit()

    create_user_with_password(
        session,
        tenant_id=tenant_a.id,
        email="shared@test.dev",
        user_id=1,
        password="Password1",
        role="CLIENT",
    )
    workshop_user = create_user_with_password(
        session,
        tenant_id=tenant_b.id,
        email="shared@test.dev",
        user_id=2,
        password="Password2",
        role="WORKSHOP",
    )

    user, token = UserService(session).login_user("shared@test.dev", "Password2")
    payload = verify_token(token)

    assert user.id == workshop_user.id
    assert payload is not None
    assert payload["tenant_id"] == str(tenant_b.id)
    assert payload["tenant_slug"] == tenant_b.slug


def test_login_user_requires_tenant_slug_when_multiple_accounts_share_credentials():
    session = build_session()
    tenant_a = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    tenant_b = Tenant(id=uuid.uuid4(), slug="tenant-b", name="Tenant B")
    session.add_all([tenant_a, tenant_b])
    session.commit()

    create_user_with_password(
        session,
        tenant_id=tenant_a.id,
        email="shared@test.dev",
        user_id=1,
        password="Password1",
        role="CLIENT",
    )
    create_user_with_password(
        session,
        tenant_id=tenant_b.id,
        email="shared@test.dev",
        user_id=2,
        password="Password1",
        role="WORKSHOP",
    )

    with pytest.raises(ValueError, match="Provide tenant_slug"):
        UserService(session).login_user("shared@test.dev", "Password1")


def test_repo_get_services_by_user_id_includes_services_linked_by_workshop_client():
    session = build_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant)
    session.commit()

    workshop_owner = create_user(session, tenant_id=tenant.id, email="owner@test.dev", user_id=1)
    client_user = create_user(session, tenant_id=tenant.id, email="client@test.dev", user_id=2)
    workshop = create_workshop(session, tenant_id=tenant.id, user_id=workshop_owner.id, workshop_id=1, email="shop@test.dev")

    workshop_client = WorkshopClient(
        tenant_id=tenant.id,
        workshop_id=workshop.id,
        name="Workshop Client",
        email=client_user.email,
        phone="5551999999999",
        vehicle_brand="Honda",
        vehicle_model="Civic",
        vehicle_year=2022,
        vehicle_plate="CLI-0001",
        user_id=client_user.id,
    )
    session.add(workshop_client)
    session.commit()
    session.refresh(workshop_client)

    service = Service(
        tenant_id=tenant.id,
        workshop_id=workshop.id,
        workshop_client_id=workshop_client.id,
        vehicle_id=None,
        name="Brake inspection",
        description="Check brake pads",
        status="pending",
        progress_percentage=0,
        checkin_date=datetime.now(timezone.utc),
    )
    session.add(service)
    session.commit()
    session.refresh(service)

    services = repo_get_services_by_user_id(session, client_user.id, tenant.id)

    assert len(services) == 1
    assert services[0].id == service.id


def test_repo_get_services_by_user_id_includes_services_linked_by_workshop_client_email():
    session = build_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant)
    session.commit()

    workshop_owner = create_user(session, tenant_id=tenant.id, email="owner@test.dev", user_id=1)
    client_user = create_user(session, tenant_id=tenant.id, email="client@test.dev", user_id=2)
    workshop = create_workshop(session, tenant_id=tenant.id, user_id=workshop_owner.id, workshop_id=1, email="shop@test.dev")

    workshop_client = WorkshopClient(
        tenant_id=tenant.id,
        workshop_id=workshop.id,
        name="Legacy Workshop Client",
        email=client_user.email,
        phone="5551999999999",
        vehicle_brand="Honda",
        vehicle_model="Civic",
        vehicle_year=2022,
        vehicle_plate="CLI-0002",
        user_id=None,
    )
    session.add(workshop_client)
    session.commit()
    session.refresh(workshop_client)

    service = Service(
        tenant_id=tenant.id,
        workshop_id=workshop.id,
        workshop_client_id=workshop_client.id,
        vehicle_id=None,
        name="Legacy email linked service",
        description="Visible by email fallback",
        status="pending",
        progress_percentage=0,
        checkin_date=datetime.now(timezone.utc),
    )
    session.add(service)
    session.commit()
    session.refresh(service)

    services = repo_get_services_by_user_id(session, client_user.id, tenant.id, user_email=client_user.email)

    assert len(services) == 1
    assert services[0].id == service.id


def test_repo_get_services_by_user_id_allows_client_cross_tenant_workshop_access_by_email():
    session = build_session()
    client_tenant = Tenant(id=uuid.uuid4(), slug="client-tenant", name="Client Tenant")
    workshop_tenant = Tenant(id=uuid.uuid4(), slug="workshop-tenant", name="Workshop Tenant")
    session.add_all([client_tenant, workshop_tenant])
    session.commit()

    client_user = create_user(session, tenant_id=client_tenant.id, email="client@test.dev", user_id=1)
    workshop_owner = create_user(session, tenant_id=workshop_tenant.id, email="owner@test.dev", user_id=2)
    workshop = create_workshop(session, tenant_id=workshop_tenant.id, user_id=workshop_owner.id, workshop_id=1, email="shop@test.dev")

    workshop_client = WorkshopClient(
        tenant_id=workshop_tenant.id,
        workshop_id=workshop.id,
        name="Cross Tenant Client",
        email=client_user.email,
        phone="5551999999999",
        vehicle_brand="Honda",
        vehicle_model="Civic",
        vehicle_year=2022,
        vehicle_plate="CLI-0003",
        user_id=None,
    )
    session.add(workshop_client)
    session.commit()
    session.refresh(workshop_client)

    service = Service(
        tenant_id=workshop_tenant.id,
        workshop_id=workshop.id,
        workshop_client_id=workshop_client.id,
        vehicle_id=None,
        name="Cross tenant service",
        description="Visible to client across tenant",
        status="in_progress",
        progress_percentage=35,
        checkin_date=datetime.now(timezone.utc),
    )
    session.add(service)
    session.commit()
    session.refresh(service)

    services = repo_get_services_by_user_id(session, client_user.id, None, user_email=client_user.email)

    assert len(services) == 1
    assert services[0].id == service.id


def test_workshop_client_service_backfills_registered_client_user_by_cross_tenant_email():
    session = build_session()
    client_tenant = Tenant(id=uuid.uuid4(), slug="client-tenant", name="Client Tenant")
    workshop_tenant = Tenant(id=uuid.uuid4(), slug="workshop-tenant", name="Workshop Tenant")
    session.add_all([client_tenant, workshop_tenant])
    session.commit()

    client_user = create_user(session, tenant_id=client_tenant.id, email="client@test.dev", user_id=1)
    workshop_owner = create_user(session, tenant_id=workshop_tenant.id, email="owner@test.dev", user_id=2)
    create_workshop(session, tenant_id=workshop_tenant.id, user_id=workshop_owner.id, workshop_id=1, email="shop@test.dev")

    service = WorkshopClientService(session)
    client = service.create_client(
        WorkshopClientCreate(
            name="Registered Client",
            email=client_user.email,
            phone="5551999999999",
            vehicle_brand="Honda",
            vehicle_model="Civic",
            vehicle_year=2022,
            vehicle_plate="MSG-0001",
        ),
        user_id=workshop_owner.id,
        tenant_id=workshop_tenant.id,
    )

    assert client.user_id == client_user.id


def test_workshop_resolution_falls_back_to_tenant_workshop_for_secondary_workshop_user():
    session = build_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant)
    session.commit()

    workshop_owner = create_user(session, tenant_id=tenant.id, email="owner@test.dev", user_id=1)
    secondary_workshop_user = create_user(session, tenant_id=tenant.id, email="staff@test.dev", user_id=2)
    workshop = create_workshop(session, tenant_id=tenant.id, user_id=workshop_owner.id, workshop_id=1, email="shop@test.dev")

    resolved = repo_get_workshop_for_user(session, secondary_workshop_user.id, tenant.id)

    assert resolved is not None
    assert resolved.id == workshop.id


def test_workshop_client_service_uses_tenant_workshop_for_secondary_workshop_user():
    session = build_session()
    tenant = Tenant(id=uuid.uuid4(), slug="tenant-a", name="Tenant A")
    session.add(tenant)
    session.commit()

    workshop_owner = create_user(session, tenant_id=tenant.id, email="owner@test.dev", user_id=1)
    secondary_workshop_user = create_user(session, tenant_id=tenant.id, email="staff@test.dev", user_id=2)
    workshop = create_workshop(session, tenant_id=tenant.id, user_id=workshop_owner.id, workshop_id=1, email="shop@test.dev")

    session.add(
        WorkshopClient(
            tenant_id=tenant.id,
            workshop_id=workshop.id,
            name="Existing Client",
            email="client@test.dev",
            phone="5551999999999",
            vehicle_brand="Honda",
            vehicle_model="Civic",
            vehicle_year=2022,
            vehicle_plate="CLI-2222",
            user_id=None,
        )
    )
    session.commit()

    clients = WorkshopClientService(session).get_clients(secondary_workshop_user.id, tenant.id)

    assert len(clients) == 1
    assert clients[0].workshop_id == workshop.id


def test_message_service_allows_cross_tenant_client_workshop_conversation():
    session = build_session()
    client_tenant = Tenant(id=uuid.uuid4(), slug="client-tenant", name="Client Tenant")
    workshop_tenant = Tenant(id=uuid.uuid4(), slug="workshop-tenant", name="Workshop Tenant")
    session.add_all([client_tenant, workshop_tenant])
    session.commit()

    client_user = create_user(session, tenant_id=client_tenant.id, email="client@test.dev", user_id=1)
    workshop_owner = create_user(session, tenant_id=workshop_tenant.id, email="owner@test.dev", user_id=2)
    workshop = create_workshop(session, tenant_id=workshop_tenant.id, user_id=workshop_owner.id, workshop_id=1, email="shop@test.dev")

    workshop_client = WorkshopClient(
        tenant_id=workshop_tenant.id,
        workshop_id=workshop.id,
        name="Conversation Client",
        email=client_user.email,
        phone="5551999999999",
        vehicle_brand="Honda",
        vehicle_model="Civic",
        vehicle_year=2022,
        vehicle_plate="MSG-0002",
        user_id=None,
    )
    session.add(workshop_client)
    session.commit()
    session.refresh(workshop_client)

    linked_service = Service(
        tenant_id=workshop_tenant.id,
        workshop_id=workshop.id,
        workshop_client_id=workshop_client.id,
        vehicle_id=None,
        name="Conversation Service",
        description="Cross-tenant service",
        status="in_progress",
        progress_percentage=10,
        checkin_date=datetime.now(timezone.utc),
    )
    session.add(linked_service)
    session.commit()

    message_service = MessageService(session)
    sent_message = message_service.send_message(
        tenant_id=client_tenant.id,
        sender_id=client_user.id,
        receiver_id=workshop_owner.id,
        content="Hello workshop",
    )
    conversation = message_service.get_conversation(client_tenant.id, client_user.id, workshop_owner.id)

    assert sent_message.tenant_id == workshop_tenant.id
    assert len(conversation) == 1
    assert conversation[0].content == "Hello workshop"


def test_tenant_context_holds_user_and_tenant_values():
    tenant_id = uuid.uuid4()
    context = TenantContext(tenant_id=tenant_id, tenant_slug="oficina-silva", user_id=42)

    assert context.tenant_id == tenant_id
    assert context.tenant_slug == "oficina-silva"
    assert context.user_id == 42


def test_schema_contains_tenant_columns_and_indexes():
    session = build_session()
    inspector = sa_inspect(session.bind)

    tenant_columns = {
        table_name: {column["name"] for column in inspector.get_columns(table_name)}
        for table_name in ["users", "vehicles", "workshops", "services", "workshop_clients", "messages", "notifications"]
    }

    for table_name, columns in tenant_columns.items():
        assert "tenant_id" in columns, f"tenant_id missing on {table_name}"

    tenant_indexes = {index["name"] for index in inspector.get_indexes("users")}
    assert "ix_users_tenant_id_id" in tenant_indexes
    assert "ix_users_tenant_id_created_at" in tenant_indexes


def test_migration_files_exist_for_phase_foundation():
    import pathlib

    versions_dir = pathlib.Path(__file__).resolve().parents[1] / "migrations" / "versions"
    migration_files = {path.name for path in versions_dir.glob("*.py")}

    assert "0001_initial_core_schema.py" in migration_files
    assert "0002_create_tenants_table.py" in migration_files
    assert "0003_add_tenant_foundation.py" in migration_files
