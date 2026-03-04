"""Add workshop_clients table and service link

Revision ID: a1b2c3d4e5f6
Revises: 48b26b02a31f
Create Date: 2026-03-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '48b26b02a31f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create workshop_clients table
    op.create_table(
        'workshop_clients',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('workshop_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=30), nullable=True),
        sa.Column('vehicle_brand', sa.String(length=100), nullable=False),
        sa.Column('vehicle_model', sa.String(length=100), nullable=False),
        sa.Column('vehicle_year', sa.Integer(), nullable=False),
        sa.Column('vehicle_plate', sa.String(length=20), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['workshop_id'], ['workshops.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workshop_id', 'vehicle_plate', name='uq_workshop_vehicle_plate'),
    )
    op.create_index('ix_workshop_clients_workshop_id', 'workshop_clients', ['workshop_id'])

    # Add workshop_client_id to services table
    op.add_column('services', sa.Column('workshop_client_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_services_workshop_client_id',
        'services', 'workshop_clients',
        ['workshop_client_id'], ['id'],
        ondelete='CASCADE'
    )

    # Make vehicle_id nullable in services table
    op.alter_column('services', 'vehicle_id', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    # Restore vehicle_id NOT NULL
    op.alter_column('services', 'vehicle_id', existing_type=sa.Integer(), nullable=False)

    # Drop workshop_client_id from services
    op.drop_constraint('fk_services_workshop_client_id', 'services', type_='foreignkey')
    op.drop_column('services', 'workshop_client_id')

    # Drop workshop_clients table
    op.drop_index('ix_workshop_clients_workshop_id', table_name='workshop_clients')
    op.drop_table('workshop_clients')
