"""add performance indexes and vote uniqueness

Revision ID: 6fa0e76ea16c
Revises:
Create Date: 2026-08-05 16:13:29.390795

This migration is idempotent. It adds the composite indexes and the
per-user unique vote constraint that are declared on the models but were
not present on databases created before the model definitions grew.
Fresh databases built by ``Base.metadata.create_all`` already include
these objects, so every statement is guarded with IF NOT EXISTS.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '6fa0e76ea16c'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE INDEX IF NOT EXISTS ix_chat_messages_user_created ON chat_messages (user_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_complaints_category ON complaints (category)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_complaints_created_at ON complaints (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_complaints_department ON complaints (department)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_complaints_status_priority ON complaints (status, priority)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_complaints_village_ward ON complaints (village, ward_number)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_user_created ON notifications (user_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_user_read ON notifications (user_id, is_read)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expires ON refresh_tokens (expires_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_refresh_tokens_revoked ON refresh_tokens (is_revoked)")
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_complaint_vote_per_user') THEN "
        "ALTER TABLE complaint_votes ADD CONSTRAINT uq_complaint_vote_per_user UNIQUE (complaint_id, user_id); "
        "END IF; END $$;"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_refresh_tokens_revoked")
    op.execute("DROP INDEX IF EXISTS ix_refresh_tokens_expires")
    op.execute("DROP INDEX IF EXISTS ix_notifications_user_read")
    op.execute("DROP INDEX IF EXISTS ix_notifications_user_created")
    op.execute("DROP INDEX IF EXISTS ix_complaints_village_ward")
    op.execute("DROP INDEX IF EXISTS ix_complaints_status_priority")
    op.execute("DROP INDEX IF EXISTS ix_complaints_department")
    op.execute("DROP INDEX IF EXISTS ix_complaints_created_at")
    op.execute("DROP INDEX IF EXISTS ix_complaints_category")
    op.execute("DROP INDEX IF EXISTS ix_chat_messages_user_created")
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_complaint_vote_per_user') THEN "
        "ALTER TABLE complaint_votes DROP CONSTRAINT uq_complaint_vote_per_user; "
        "END IF; END $$;"
    )
