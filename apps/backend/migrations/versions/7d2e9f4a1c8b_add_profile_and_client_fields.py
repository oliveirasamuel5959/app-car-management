"""add profile/contact fields to users & workshops, notes/status to workshop_clients, workshop_client_id to services_history

Revision ID: 7d2e9f4a1c8b
Revises: 6b1f2a9c4d3e
Create Date: 2026-07-22 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7d2e9f4a1c8b"
down_revision: str | Sequence[str] | None = "6b1f2a9c4d3e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # --- users: profile / contact info ---
    op.add_column("users", sa.Column("phone", sa.String(length=30), nullable=True))
    op.add_column("users", sa.Column("address", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("state", sa.String(length=100), nullable=True))
    op.add_column(
        "users", sa.Column("avatar_url", sa.String(length=500), nullable=True)
    )
    op.add_column(
        "users", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True)
    )

    # --- workshops: contact / address / branding ---
    op.add_column("workshops", sa.Column("phone", sa.String(length=30), nullable=True))
    op.add_column(
        "workshops", sa.Column("address", sa.String(length=255), nullable=True)
    )
    op.add_column("workshops", sa.Column("city", sa.String(length=100), nullable=True))
    op.add_column("workshops", sa.Column("state", sa.String(length=100), nullable=True))
    op.add_column(
        "workshops", sa.Column("opening_hours", sa.String(length=255), nullable=True)
    )
    op.add_column(
        "workshops", sa.Column("logo_url", sa.String(length=500), nullable=True)
    )

    # --- workshop_clients: workshop-managed metadata ---
    op.add_column("workshop_clients", sa.Column("notes", sa.Text(), nullable=True))
    op.add_column(
        "workshop_clients",
        sa.Column(
            "status", sa.String(length=20), nullable=False, server_default="active"
        ),
    )

    # --- services_history: link record to a workshop client ---
    op.add_column(
        "services_history",
        sa.Column("workshop_client_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_services_history_workshop_client_id_workshop_clients",
        "services_history",
        "workshop_clients",
        ["workshop_client_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_services_history_tenant_id_workshop_client_id",
        "services_history",
        ["tenant_id", "workshop_client_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "ix_services_history_tenant_id_workshop_client_id",
        table_name="services_history",
    )
    op.drop_constraint(
        "fk_services_history_workshop_client_id_workshop_clients",
        "services_history",
        type_="foreignkey",
    )
    op.drop_column("services_history", "workshop_client_id")

    op.drop_column("workshop_clients", "status")
    op.drop_column("workshop_clients", "notes")

    op.drop_column("workshops", "logo_url")
    op.drop_column("workshops", "opening_hours")
    op.drop_column("workshops", "state")
    op.drop_column("workshops", "city")
    op.drop_column("workshops", "address")
    op.drop_column("workshops", "phone")

    op.drop_column("users", "updated_at")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "state")
    op.drop_column("users", "city")
    op.drop_column("users", "address")
    op.drop_column("users", "phone")
