"""fix_meetings_columns

Revision ID: f37785d826c2
Revises: a1b2c3d4e5f6
Create Date: 2026-10-14 22:20:41.543231

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f37785d826c2'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Get existing columns for meetings table
    existing_meetings_cols = [c['name'] for c in inspector.get_columns('meetings')]
    
    # Add missing columns if they don't exist
    if 'team_names' not in existing_meetings_cols:
        op.add_column('meetings', sa.Column('team_names', sa.Text(), nullable=True))
    
    if 'calendar_link' not in existing_meetings_cols:
        op.add_column('meetings', sa.Column('calendar_link', sa.String(length=500), nullable=True))
    
    if 'updated_at' not in existing_meetings_cols:
        op.add_column('meetings', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    
    # Get existing columns for meetings table
    existing_meetings_cols = [c['name'] for c in inspector.get_columns('meetings')]
    
    # Only drop columns if they exist
    if 'updated_at' in existing_meetings_cols:
        op.drop_column('meetings', 'updated_at')
    if 'calendar_link' in existing_meetings_cols:
        op.drop_column('meetings', 'calendar_link')
    if 'team_names' in existing_meetings_cols:
        op.drop_column('meetings', 'team_names')
