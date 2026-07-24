"""create schedules and workshop_ratings tables, add schedule_id to notifications

Revision ID: db89f1a0944a
Revises: b6d608d083d6
Create Date: 2026-07-24 10:56:52.491914
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "db89f1a0944a"
down_revision: str | Sequence[str] | None = "b6d608d083d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_table(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


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


def upgrade() -> None:
    """Create schedules, workshop_ratings tables; add schedule_id FK to notifications."""

    # --- schedules table ---
    if not _has_table("schedules"):
        op.create_table(
            "schedules",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column(
                "client_tenant_id",
                postgresql.UUID(as_uuid=False),
                sa.ForeignKey("tenants.id"),
                nullable=False,
            ),
            sa.Column(
                "workshop_tenant_id",
                postgresql.UUID(as_uuid=False),
                sa.ForeignKey("tenants.id"),
                nullable=False,
            ),
            sa.Column(
                "workshop_id",
                sa.Integer(),
                sa.ForeignKey("workshops.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "vehicle_id",
                sa.Integer(),
                sa.ForeignKey("vehicles.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "service_request_type", sa.String(length=20), nullable=False
            ),
            sa.Column("problem_description", sa.Text(), nullable=False),
            sa.Column("contact_phone", sa.String(length=20), nullable=False),
            sa.Column("contact_email", sa.String(length=255), nullable=False),
            sa.Column(
                "scheduled_at", sa.DateTime(timezone=True), nullable=False
            ),
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=False,
                server_default="pendente",
            ),
            sa.Column(
                "viewed_at", sa.DateTime(timezone=True), nullable=True
            ),
            sa.Column(
                "responded_at", sa.DateTime(timezone=True), nullable=True
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column(
                "updated_at", sa.DateTime(timezone=True), nullable=True
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    # Composite indexes on schedules
    if not _has_index("schedules", "ix_schedules_workshop_tenant_id_scheduled_at"):
        op.create_index(
            "ix_schedules_workshop_tenant_id_scheduled_at",
            "schedules",
            ["workshop_tenant_id", "scheduled_at"],
            unique=False,
        )
    if not _has_index("schedules", "ix_schedules_client_tenant_id_status"):
        op.create_index(
            "ix_schedules_client_tenant_id_status",
            "schedules",
            ["client_tenant_id", "status"],
            unique=False,
        )
    if not _has_index("schedules", "ix_schedules_client_tenant_id"):
        op.create_index(
            "ix_schedules_client_tenant_id",
            "schedules",
            ["client_tenant_id"],
            unique=False,
        )
    if not _has_index("schedules", "ix_schedules_workshop_tenant_id"):
        op.create_index(
            "ix_schedules_workshop_tenant_id",
            "schedules",
            ["workshop_tenant_id"],
            unique=False,
        )
    if not _has_index("schedules", "ix_schedules_workshop_id"):
        op.create_index(
            "ix_schedules_workshop_id",
            "schedules",
            ["workshop_id"],
            unique=False,
        )
    if not _has_index("schedules", "ix_schedules_vehicle_id"):
        op.create_index(
            "ix_schedules_vehicle_id",
            "schedules",
            ["vehicle_id"],
            unique=False,
        )
    if not _has_index("schedules", "ix_schedules_status"):
        op.create_index(
            "ix_schedules_status",
            "schedules",
            ["status"],
            unique=False,
        )

    # --- workshop_ratings table ---
    if not _has_table("workshop_ratings"):
        op.create_table(
            "workshop_ratings",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column(
                "workshop_tenant_id",
                postgresql.UUID(as_uuid=False),
                sa.ForeignKey("tenants.id"),
                nullable=False,
            ),
            sa.Column(
                "client_tenant_id",
                postgresql.UUID(as_uuid=False),
                sa.ForeignKey("tenants.id"),
                nullable=False,
            ),
            sa.Column(
                "schedule_id",
                sa.Integer(),
                sa.ForeignKey("schedules.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("schedule_id", name="uq_workshop_ratings_schedule_id"),
            sa.CheckConstraint(
                "rating >= 0 AND rating <= 5",
                name="ck_workshop_ratings_rating_range",
            ),
        )

    # Indexes on workshop_ratings
    if not _has_index("workshop_ratings", "ix_workshop_ratings_workshop_tenant_id"):
        op.create_index(
            "ix_workshop_ratings_workshop_tenant_id",
            "workshop_ratings",
            ["workshop_tenant_id"],
            unique=False,
        )
    if not _has_index("workshop_ratings", "ix_workshop_ratings_client_tenant_id"):
        op.create_index(
            "ix_workshop_ratings_client_tenant_id",
            "workshop_ratings",
            ["client_tenant_id"],
            unique=False,
        )
    if not _has_index("workshop_ratings", "ix_workshop_ratings_schedule_id"):
        op.create_index(
            "ix_workshop_ratings_schedule_id",
            "workshop_ratings",
            ["schedule_id"],
            unique=False,
        )

    # --- notifications: add schedule_id FK ---
    if not _has_column("notifications", "schedule_id"):
        op.add_column(
            "notifications",
            sa.Column(
                "schedule_id",
                sa.Integer(),
                sa.ForeignKey("schedules.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )
    if not _has_index("notifications", "ix_notifications_schedule_id"):
        op.create_index(
            "ix_notifications_schedule_id",
            "notifications",
            ["schedule_id"],
            unique=False,
        )


def downgrade() -> None:
    """Remove schedule_id from notifications; drop workshop_ratings and schedules tables."""

    # Remove schedule_id from notifications
    op.drop_index("ix_notifications_schedule_id", table_name="notifications")
    op.drop_constraint(
        "notifications_schedule_id_fkey", "notifications", type_="foreignkey"
    )
    op.drop_column("notifications", "schedule_id")

    # Drop workshop_ratings
    op.drop_index(
        "ix_workshop_ratings_schedule_id", table_name="workshop_ratings"
    )
    op.drop_index(
        "ix_workshop_ratings_client_tenant_id", table_name="workshop_ratings"
    )
    op.drop_index(
        "ix_workshop_ratings_workshop_tenant_id", table_name="workshop_ratings"
    )
    op.drop_table("workshop_ratings")

    # Drop schedules
    op.drop_index("ix_schedules_status", table_name="schedules")
    op.drop_index("ix_schedules_vehicle_id", table_name="schedules")
    op.drop_index("ix_schedules_workshop_id", table_name="schedules")
    op.drop_index("ix_schedules_workshop_tenant_id", table_name="schedules")
    op.drop_index("ix_schedules_client_tenant_id", table_name="schedules")
    op.drop_index(
        "ix_schedules_client_tenant_id_status", table_name="schedules"
    )
    op.drop_index(
        "ix_schedules_workshop_tenant_id_scheduled_at", table_name="schedules"
    )
    op.drop_table("schedules")
