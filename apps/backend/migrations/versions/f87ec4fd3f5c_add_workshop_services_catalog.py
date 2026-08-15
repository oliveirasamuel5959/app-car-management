"""add workshop_services catalog

Revision ID: f87ec4fd3f5c
Revises: db89f1a0944a
Create Date: 2026-08-14 21:08:39.467593

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f87ec4fd3f5c'
down_revision: Union[str, Sequence[str], None] = 'db89f1a0944a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'workshop_services',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('workshop_id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('service_type', sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.ForeignKeyConstraint(['workshop_id'], ['workshops.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workshop_id', 'service_type', name='uq_workshop_services_workshop_type')
    )
    op.create_index(op.f('ix_workshop_services_tenant_id'), 'workshop_services', ['tenant_id'], unique=False)
    op.create_index('ix_workshop_services_tenant_id_id', 'workshop_services', ['tenant_id', 'id'], unique=False)
    op.create_index(op.f('ix_workshop_services_workshop_id'), 'workshop_services', ['workshop_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_workshop_services_workshop_id'), table_name='workshop_services')
    op.drop_index('ix_workshop_services_tenant_id_id', table_name='workshop_services')
    op.drop_index(op.f('ix_workshop_services_tenant_id'), table_name='workshop_services')
    op.drop_table('workshop_services')
