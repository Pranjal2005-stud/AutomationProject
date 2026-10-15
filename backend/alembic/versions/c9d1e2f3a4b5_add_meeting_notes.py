"""add_meeting_notes

Revision ID: c9d1e2f3a4b5
Revises: f37785d826c2
Create Date: 2026-10-16 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c9d1e2f3a4b5'
down_revision: Union[str, Sequence[str], None] = 'f37785d826c2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c['name'] for c in inspector.get_columns('meetings')]
    if 'notes' not in cols:
        op.add_column('meetings', sa.Column('notes', sa.Text(), nullable=True))
    if 'notes_jira_comment_id' not in cols:
        op.add_column('meetings', sa.Column('notes_jira_comment_id', sa.String(255), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c['name'] for c in inspector.get_columns('meetings')]
    if 'notes_jira_comment_id' in cols:
        op.drop_column('meetings', 'notes_jira_comment_id')
    if 'notes' in cols:
        op.drop_column('meetings', 'notes')
