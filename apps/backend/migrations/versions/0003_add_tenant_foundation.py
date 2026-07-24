"""add tenant foundation to core tables

Revision ID: 0003_add_tenant_foundation
Revises: 0002_create_tenants_table
Create Date: 2026-06-01 10:10:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003_add_tenant_foundation"
down_revision = "0002_create_tenants_table"
branch_labels = None
depends_on = None

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(
        column["name"] == column_name for column in inspector.get_columns(table_name)
    )


def _has_index(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(
        index["name"] == index_name for index in inspector.get_indexes(table_name)
    )


def _has_unique_constraint(table_name: str, constraint_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(
        constraint["name"] == constraint_name
        for constraint in inspector.get_unique_constraints(table_name)
    )


def _has_foreign_key(table_name: str, fk_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(fk["name"] == fk_name for fk in inspector.get_foreign_keys(table_name))


def _add_tenant_column(table_name: str) -> None:
    if not _has_column(table_name, "tenant_id"):
        op.add_column(
            table_name,
            sa.Column("tenant_id", postgresql.UUID(as_uuid=False), nullable=True),
        )
    op.execute(
        sa.text(
            f"UPDATE {table_name} SET tenant_id = :tenant_id WHERE tenant_id IS NULL"
        ).bindparams(tenant_id=DEFAULT_TENANT_ID)
    )
    op.alter_column(table_name, "tenant_id", nullable=False)
    fk_name = f"fk_{table_name}_tenant_id"
    if not _has_foreign_key(table_name, fk_name):
        op.create_foreign_key(fk_name, table_name, "tenants", ["tenant_id"], ["id"])


def upgrade() -> None:
    for table_name in [
        "users",
        "vehicles",
        "workshops",
        "services",
        "workshop_clients",
        "messages",
        "notifications",
    ]:
        _add_tenant_column(table_name)

    if not _has_column("workshops", "email"):
        op.add_column(
            "workshops", sa.Column("email", sa.String(length=255), nullable=True)
        )

    if _has_index("users", "ix_users_email"):
        op.drop_index("ix_users_email", table_name="users")
    if not _has_unique_constraint("users", "uq_users_tenant_email"):
        op.create_unique_constraint(
            "uq_users_tenant_email", "users", ["tenant_id", "email"]
        )
    if not _has_index("users", "ix_users_tenant_id_id"):
        op.create_index(
            "ix_users_tenant_id_id", "users", ["tenant_id", "id"], unique=False
        )
    if not _has_index("users", "ix_users_tenant_id_created_at"):
        op.create_index(
            "ix_users_tenant_id_created_at",
            "users",
            ["tenant_id", "created_at"],
            unique=False,
        )

    if not _has_index("vehicles", "ix_vehicles_tenant_id_id"):
        op.create_index(
            "ix_vehicles_tenant_id_id", "vehicles", ["tenant_id", "id"], unique=False
        )

    if not _has_unique_constraint("workshops", "uq_workshops_tenant_id"):
        op.create_unique_constraint(
            "uq_workshops_tenant_id", "workshops", ["tenant_id"]
        )
    if not _has_unique_constraint("workshops", "uq_workshops_tenant_email"):
        op.create_unique_constraint(
            "uq_workshops_tenant_email", "workshops", ["tenant_id", "email"]
        )
    if not _has_index("workshops", "ix_workshops_tenant_id_id"):
        op.create_index(
            "ix_workshops_tenant_id_id", "workshops", ["tenant_id", "id"], unique=False
        )

    if not _has_index("services", "ix_services_tenant_id_id"):
        op.create_index(
            "ix_services_tenant_id_id", "services", ["tenant_id", "id"], unique=False
        )
    if not _has_index("workshop_clients", "ix_workshop_clients_tenant_id_id"):
        op.create_index(
            "ix_workshop_clients_tenant_id_id",
            "workshop_clients",
            ["tenant_id", "id"],
            unique=False,
        )
    if not _has_index("workshop_clients", "ix_workshop_clients_tenant_id_created_at"):
        op.create_index(
            "ix_workshop_clients_tenant_id_created_at",
            "workshop_clients",
            ["tenant_id", "created_at"],
            unique=False,
        )
    if not _has_index("messages", "ix_messages_tenant_id_id"):
        op.create_index(
            "ix_messages_tenant_id_id", "messages", ["tenant_id", "id"], unique=False
        )
    if not _has_index("messages", "ix_messages_tenant_id_created_at"):
        op.create_index(
            "ix_messages_tenant_id_created_at",
            "messages",
            ["tenant_id", "created_at"],
            unique=False,
        )
    if not _has_index("notifications", "ix_notifications_tenant_id_id"):
        op.create_index(
            "ix_notifications_tenant_id_id",
            "notifications",
            ["tenant_id", "id"],
            unique=False,
        )
    if not _has_index("notifications", "ix_notifications_tenant_id_created_at"):
        op.create_index(
            "ix_notifications_tenant_id_created_at",
            "notifications",
            ["tenant_id", "created_at"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index("ix_notifications_tenant_id_created_at", table_name="notifications")
    op.drop_index("ix_notifications_tenant_id_id", table_name="notifications")
    op.drop_index("ix_messages_tenant_id_created_at", table_name="messages")
    op.drop_index("ix_messages_tenant_id_id", table_name="messages")
    op.drop_index(
        "ix_workshop_clients_tenant_id_created_at", table_name="workshop_clients"
    )
    op.drop_index("ix_workshop_clients_tenant_id_id", table_name="workshop_clients")
    op.drop_index("ix_services_tenant_id_id", table_name="services")
    op.drop_index("ix_workshops_tenant_id_id", table_name="workshops")
    op.drop_constraint("uq_workshops_tenant_email", "workshops", type_="unique")
    op.drop_constraint("uq_workshops_tenant_id", "workshops", type_="unique")
    op.drop_index("ix_vehicles_tenant_id_id", table_name="vehicles")
    op.drop_index("ix_users_tenant_id_created_at", table_name="users")
    op.drop_index("ix_users_tenant_id_id", table_name="users")
    op.drop_constraint("uq_users_tenant_email", "users", type_="unique")
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.drop_column("workshops", "email")

    for table_name in [
        "notifications",
        "messages",
        "workshop_clients",
        "services",
        "workshops",
        "vehicles",
        "users",
    ]:
        op.drop_constraint(f"fk_{table_name}_tenant_id", table_name, type_="foreignkey")
        op.drop_column(table_name, "tenant_id")
