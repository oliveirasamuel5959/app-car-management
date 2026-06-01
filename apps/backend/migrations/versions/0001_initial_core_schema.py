"""create initial core schema

Revision ID: 0001_initial_core_schema
Revises:
Create Date: 2026-06-01 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_core_schema"
down_revision = None
branch_labels = None
depends_on = None


def _has_table(table_name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(table_name)


def _has_index(table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=50), nullable=False),
            sa.Column("age", sa.Integer(), nullable=False),
            sa.Column("sex", sa.String(length=20), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("password_hash", sa.String(), nullable=False),
            sa.Column("role", sa.String(length=20), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        )
    if _has_table("users") and not _has_index("users", "ix_users_email"):
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    if not _has_table("vehicles"):
        op.create_table(
            "vehicles",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("brand", sa.String(length=100), nullable=False),
            sa.Column("model", sa.String(length=100), nullable=False),
            sa.Column("year", sa.Integer(), nullable=False),
            sa.Column("plate", sa.String(length=20), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        )
    if _has_table("vehicles") and not _has_index("vehicles", "ix_vehicles_plate"):
        op.create_index("ix_vehicles_plate", "vehicles", ["plate"], unique=True)

    if not _has_table("workshops"):
        op.create_table(
            "workshops",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("rating_avg", sa.Float(), nullable=False, server_default="0"),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        )

    if not _has_table("workshop_clients"):
        op.create_table(
            "workshop_clients",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("workshop_id", sa.Integer(), sa.ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("phone", sa.String(length=30), nullable=True),
            sa.Column("vehicle_brand", sa.String(length=100), nullable=False),
            sa.Column("vehicle_model", sa.String(length=100), nullable=False),
            sa.Column("vehicle_year", sa.Integer(), nullable=False),
            sa.Column("vehicle_plate", sa.String(length=20), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.UniqueConstraint("workshop_id", "vehicle_plate", name="uq_workshop_vehicle_plate"),
        )

    if not _has_table("services"):
        op.create_table(
            "services",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("workshop_id", sa.Integer(), sa.ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False),
            sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=True),
            sa.Column("workshop_client_id", sa.Integer(), sa.ForeignKey("workshop_clients.id", ondelete="CASCADE"), nullable=True),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="pending"),
            sa.Column("progress_percentage", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("checkin_date", sa.DateTime(), nullable=False),
            sa.Column("estimated_finish_date", sa.DateTime(), nullable=True),
            sa.Column("finished_at", sa.DateTime(), nullable=True),
            sa.Column("estimated_hours", sa.Float(), nullable=True),
            sa.Column("actual_hours", sa.Float(), nullable=True),
            sa.Column("estimated_cost", sa.Float(), nullable=True),
            sa.Column("final_cost", sa.Float(), nullable=True),
            sa.Column("workshop_notes", sa.Text(), nullable=True),
        )

    if not _has_table("messages"):
        op.create_table(
            "messages",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("uuid", sa.String(length=36), nullable=False),
            sa.Column("sender_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("receiver_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("message_type", sa.String(length=20), nullable=False, server_default="text"),
            sa.Column("file_url", sa.String(length=500), nullable=True),
            sa.Column("file_name", sa.String(length=255), nullable=True),
            sa.Column("file_size", sa.Integer(), nullable=True),
            sa.Column("mime_type", sa.String(length=100), nullable=True),
            sa.Column("is_edited", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        )
    if _has_table("messages") and not _has_index("messages", "ix_messages_id"):
        op.create_index("ix_messages_id", "messages", ["id"], unique=False)
    if _has_table("messages") and not _has_index("messages", "ix_messages_uuid"):
        op.create_index("ix_messages_uuid", "messages", ["uuid"], unique=True)

    if not _has_table("notifications"):
        op.create_table(
            "notifications",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id"), nullable=True),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("message", sa.String(length=500), nullable=False),
            sa.Column("notification_type", sa.String(length=50), nullable=False),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        )
    if _has_table("notifications") and not _has_index("notifications", "ix_notifications_user_id"):
        op.create_index("ix_notifications_user_id", "notifications", ["user_id"], unique=False)
    if _has_table("notifications") and not _has_index("notifications", "ix_notifications_service_id"):
        op.create_index("ix_notifications_service_id", "notifications", ["service_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_notifications_service_id", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_messages_uuid", table_name="messages")
    op.drop_index("ix_messages_id", table_name="messages")
    op.drop_table("messages")
    op.drop_table("services")
    op.drop_table("workshop_clients")
    op.drop_table("workshops")
    op.drop_index("ix_vehicles_plate", table_name="vehicles")
    op.drop_table("vehicles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")