"""add service_parts table and service order link on services_history

Revision ID: a1b2c3d4e5f6
Revises: f87ec4fd3f5c
Create Date: 2026-08-15 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "f87ec4fd3f5c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "service_parts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("service_order_id", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("total_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(
            ["service_order_id"], ["services.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_service_parts_tenant_id"), "service_parts", ["tenant_id"], unique=False
    )
    op.create_index(
        "ix_service_parts_tenant_id_id",
        "service_parts",
        ["tenant_id", "id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_service_parts_service_order_id"),
        "service_parts",
        ["service_order_id"],
        unique=False,
    )

    op.add_column(
        "services_history",
        sa.Column("service_order_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_services_history_service_order_id_services",
        "services_history",
        "services",
        ["service_order_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_services_history_service_order_id"),
        "services_history",
        ["service_order_id"],
        unique=False,
    )
    op.add_column(
        "services_history",
        sa.Column("labor_description", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("services_history", "labor_description")
    op.drop_index(
        op.f("ix_services_history_service_order_id"), table_name="services_history"
    )
    op.drop_constraint(
        "fk_services_history_service_order_id_services",
        "services_history",
        type_="foreignkey",
    )
    op.drop_column("services_history", "service_order_id")

    op.drop_index(op.f("ix_service_parts_service_order_id"), table_name="service_parts")
    op.drop_index("ix_service_parts_tenant_id_id", table_name="service_parts")
    op.drop_index(op.f("ix_service_parts_tenant_id"), table_name="service_parts")
    op.drop_table("service_parts")
