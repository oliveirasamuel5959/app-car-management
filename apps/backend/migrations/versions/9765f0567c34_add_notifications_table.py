"""Add notifications table

Revision ID: 9765f0567c34
Revises: 0714974a1b44
Create Date: 2026-04-21 11:53:39.213756

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9765f0567c34'
down_revision: Union[str, Sequence[str], None] = '0714974a1b44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False, index=True),
        sa.Column('service_id', sa.Integer(), nullable=True, index=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.String(length=500), nullable=False),
        sa.Column('notification_type', sa.String(length=50), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('notifications')
