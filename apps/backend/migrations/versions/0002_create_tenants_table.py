<<<<<<< HEAD
"""create tenants table

Revision ID: 0002_create_tenants_table
Revises: 0001_initial_core_schema
Create Date: 2026-06-01 10:05:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002_create_tenants_table"
down_revision = "0001_initial_core_schema"
branch_labels = None
depends_on = None

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"


def _has_table(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def _has_index(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(
        index["name"] == index_name for index in inspector.get_indexes(table_name)
    )


def upgrade() -> None:
    if not _has_table("tenants"):
        op.create_table(
            "tenants",
            sa.Column(
                "id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False
            ),
            sa.Column("slug", sa.String(length=100), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("now()"),
            ),
        )

    if _has_table("tenants") and not _has_index("tenants", "ix_tenants_slug"):
        op.create_index("ix_tenants_slug", "tenants", ["slug"], unique=True)

    bind = op.get_bind()
    existing_tenant = bind.execute(
        sa.text(
            "SELECT 1 FROM tenants WHERE id = :tenant_id OR slug = 'default' LIMIT 1"
        ).bindparams(tenant_id=DEFAULT_TENANT_ID)
    ).scalar()
    if not existing_tenant:
        op.execute(sa.text("""
                INSERT INTO tenants (id, slug, name)
                VALUES (:tenant_id, 'default', 'Default Tenant')
                """).bindparams(tenant_id=DEFAULT_TENANT_ID))


def downgrade() -> None:
    op.drop_index("ix_tenants_slug", table_name="tenants")
    op.drop_table("tenants")
=======
"""create tenants table

Revision ID: 0002_create_tenants_table
Revises: 0001_initial_core_schema
Create Date: 2026-06-01 10:05:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0002_create_tenants_table"
down_revision = "0001_initial_core_schema"
branch_labels = None
depends_on = None

DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001"


def _has_table(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def _has_index(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _has_table("tenants"):
        op.create_table(
            "tenants",
            sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, nullable=False),
            sa.Column("slug", sa.String(length=100), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        )

    if _has_table("tenants") and not _has_index("tenants", "ix_tenants_slug"):
        op.create_index("ix_tenants_slug", "tenants", ["slug"], unique=True)

    bind = op.get_bind()
    existing_tenant = bind.execute(
        sa.text("SELECT 1 FROM tenants WHERE id = :tenant_id OR slug = 'default' LIMIT 1").bindparams(
            tenant_id=DEFAULT_TENANT_ID
        )
    ).scalar()
    if not existing_tenant:
        op.execute(
            sa.text(
                """
                INSERT INTO tenants (id, slug, name)
                VALUES (:tenant_id, 'default', 'Default Tenant')
                """
            ).bindparams(tenant_id=DEFAULT_TENANT_ID)
        )


def downgrade() -> None:
    op.drop_index("ix_tenants_slug", table_name="tenants")
    op.drop_table("tenants")
>>>>>>> c5ef6a45 (WIP: salva alterações locais)
