"""add workshop, status, labor/parts cost, invoice, warranty to services_history

Revision ID: 6b1f2a9c4d3e
Revises: 2cfd483fe51f
Create Date: 2026-07-03 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6b1f2a9c4d3e"
down_revision: str | Sequence[str] | None = "2cfd483fe51f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "services_history", sa.Column("workshop_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "fk_services_history_workshop_id_workshops",
        "services_history",
        "workshops",
        ["workshop_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_services_history_tenant_id_workshop_id",
        "services_history",
        ["tenant_id", "workshop_id"],
        unique=False,
    )

    op.add_column(
        "services_history",
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default="completed"
        ),
    )

    op.add_column(
        "services_history",
        sa.Column("labor_cost", sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.add_column(
        "services_history",
        sa.Column("parts_cost", sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.execute("UPDATE services_history SET labor_cost = cost")
    op.drop_column("services_history", "cost")

    op.add_column(
        "services_history",
        sa.Column("invoice_number", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "services_history",
        sa.Column("warranty_until_date", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "services_history", sa.Column("warranty_mileage", sa.Integer(), nullable=True)
    )
    op.add_column(
        "services_history", sa.Column("updated_at", sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("services_history", "updated_at")
    op.drop_column("services_history", "warranty_mileage")
    op.drop_column("services_history", "warranty_until_date")
    op.drop_column("services_history", "invoice_number")

    op.add_column(
        "services_history",
        sa.Column("cost", sa.Numeric(precision=10, scale=2), nullable=True),
    )
    op.execute("UPDATE services_history SET cost = labor_cost")
    op.drop_column("services_history", "parts_cost")
    op.drop_column("services_history", "labor_cost")

    op.drop_column("services_history", "status")

    op.drop_index(
        "ix_services_history_tenant_id_workshop_id", table_name="services_history"
    )
    op.drop_constraint(
        "fk_services_history_workshop_id_workshops",
        "services_history",
        type_="foreignkey",
    )
    op.drop_column("services_history", "workshop_id")
