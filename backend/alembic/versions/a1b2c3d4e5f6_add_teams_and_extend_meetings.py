"""add teams and extend meetings

Revision ID: a1b2c3d4e5f6
Revises: ee78286bf448
Create Date: 2026-08-07 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from datetime import datetime

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'ee78286bf448'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()
    existing_meetings_cols = [c['name'] for c in inspector.get_columns('meetings')] if 'meetings' in existing_tables else []

    # Teams table
    if 'teams' not in existing_tables:
        op.create_table(
            'teams',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('name'),
        )
        op.create_index(op.f('ix_teams_id'), 'teams', ['id'], unique=False)

    # Team members table
    if 'team_members' not in existing_tables:
        op.create_table(
            'team_members',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('team_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=True),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_team_members_id'), 'team_members', ['id'], unique=False)

    # Extend meetings table — only add columns that don't exist yet
    if 'team_names' not in existing_meetings_cols:
        op.add_column('meetings', sa.Column('team_names', sa.Text(), nullable=True))
    if 'calendar_link' not in existing_meetings_cols:
        op.add_column('meetings', sa.Column('calendar_link', sa.String(length=500), nullable=True))
    if 'updated_at' not in existing_meetings_cols:
        op.add_column('meetings', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))

    # Seed initial teams only if table was just created or is empty
    result = bind.execute(sa.text('SELECT COUNT(*) FROM teams')).scalar()
    if result == 0:
        teams_table = table('teams',
            column('id', sa.Integer),
            column('name', sa.String),
            column('description', sa.Text),
        )
        op.bulk_insert(teams_table, [
            {'id': 1, 'name': 'Project Hanna',  'description': 'Project Hanna team'},
            {'id': 2, 'name': 'Project Simon',  'description': 'Project Simon team'},
            {'id': 3, 'name': 'Project Atlas',  'description': 'Project Atlas team'},
        ])

        members_table = table('team_members',
            column('team_id', sa.Integer),
            column('name', sa.String),
            column('email', sa.String),
        )
        op.bulk_insert(members_table, [
            {'team_id': 1, 'name': None, 'email': 'krishparinita@gmail.com'},
            {'team_id': 1, 'name': None, 'email': 'krishnaragh347@gmail.com'},
            {'team_id': 2, 'name': None, 'email': 'pranjalraghu2@gmail.com'},
            {'team_id': 2, 'name': None, 'email': 'raghuwanshipn@rknec.edu'},
            {'team_id': 3, 'name': None, 'email': 'raghuwanshipranjal9@gmail.com'},
            {'team_id': 3, 'name': None, 'email': 'krishparinita@gmail.com'},
        ])


def downgrade() -> None:
    op.drop_column('meetings', 'updated_at')
    op.drop_column('meetings', 'calendar_link')
    op.drop_column('meetings', 'team_names')
    op.drop_index(op.f('ix_team_members_id'), table_name='team_members')
    op.drop_table('team_members')
    op.drop_index(op.f('ix_teams_id'), table_name='teams')
    op.drop_table('teams')
