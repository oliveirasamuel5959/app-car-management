"""add payments table and workshop_ratings service_order_id link

Revision ID: 894ad4d4a168
Revises: a1b2c3d4e5f6
Create Date: 2026-08-15 13:51:34.534536

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "894ad4d4a168"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("service_order_id", sa.Integer(), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("platform_fee_cents", sa.Integer(), nullable=False),
        sa.Column("workshop_amount_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("stripe_payment_intent_id", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["service_order_id"], ["services.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("service_order_id", name="uq_payments_service_order_id"),
    )
    op.create_index(
        op.f("ix_payments_tenant_id"), "payments", ["tenant_id"], unique=False
    )
    op.create_index(
        "ix_payments_tenant_id_id", "payments", ["tenant_id", "id"], unique=False
    )
    op.add_column(
        "workshop_ratings", sa.Column("service_order_id", sa.Integer(), nullable=True)
    )
    op.create_index(
        op.f("ix_workshop_ratings_service_order_id"),
        "workshop_ratings",
        ["service_order_id"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_workshop_ratings_service_order_id", "workshop_ratings", ["service_order_id"]
    )
    op.create_foreign_key(
        "fk_workshop_ratings_service_order_id_services",
        "workshop_ratings",
        "services",
        ["service_order_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "fk_workshop_ratings_service_order_id_services",
        "workshop_ratings",
        type_="foreignkey",
    )
    op.drop_constraint(
        "uq_workshop_ratings_service_order_id", "workshop_ratings", type_="unique"
    )
    op.drop_index(
        op.f("ix_workshop_ratings_service_order_id"), table_name="workshop_ratings"
    )
    op.drop_column("workshop_ratings", "service_order_id")
    op.drop_index("ix_payments_tenant_id_id", table_name="payments")
    op.drop_index(op.f("ix_payments_tenant_id"), table_name="payments")
    op.drop_table("payments")
