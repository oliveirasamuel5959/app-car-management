"""add workshop operating hours fields for agendamento

Revision ID: b6d608d083d6
Revises: 7d2e9f4a1c8b
Create Date: 2026-07-24 10:43:16.663403
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b6d608d083d6"
down_revision: str | Sequence[str] | None = "7d2e9f4a1c8b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_column(table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return any(
        column["name"] == column_name for column in inspector.get_columns(table_name)
    )


def upgrade() -> None:
    """Add structured operating-hours fields to workshops."""
    if not _has_column("workshops", "opening_time"):
        op.add_column("workshops", sa.Column("opening_time", sa.Time(), nullable=True))
    if not _has_column("workshops", "closing_time"):
        op.add_column("workshops", sa.Column("closing_time", sa.Time(), nullable=True))
    if not _has_column("workshops", "work_days"):
        op.add_column(
            "workshops",
            sa.Column(
                "work_days",
                sa.String(length=20),
                nullable=True,
                comment="CSV of ISO weekday ints, e.g. 1,2,3,4,5 (1=Monday, 7=Sunday)",
            ),
        )
    if not _has_column("workshops", "employee_count"):
        op.add_column(
            "workshops", sa.Column("employee_count", sa.Integer(), nullable=True)
        )


def downgrade() -> None:
    """Remove structured operating-hours fields from workshops."""
    op.drop_column("workshops", "employee_count")
    op.drop_column("workshops", "work_days")
    op.drop_column("workshops", "closing_time")
    op.drop_column("workshops", "opening_time")
