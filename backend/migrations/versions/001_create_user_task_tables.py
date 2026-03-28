"""create user and task tables

Revision ID: 001
Revises:
Create Date: 2026-03-26 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # user table
    op.create_table(
        "user",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sqlmodel.AutoString(length=320), nullable=False),
        sa.Column("hashed_password", sqlmodel.AutoString(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_email"), "user", ["email"], unique=True)
    op.create_index(op.f("ix_user_id"), "user", ["id"], unique=False)

    # task table
    op.create_table(
        "task",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sqlmodel.AutoString(length=200), nullable=False),
        sa.Column("description", sqlmodel.AutoString(length=1000), nullable=True),
        sa.Column("is_complete", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
            ondelete="CASCADE",  # deleting user removes all their tasks
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_task_id"), "task", ["id"], unique=False)
    op.create_index(op.f("ix_task_user_id"), "task", ["user_id"], unique=False)
    # Composite index for list + status filter queries
    op.create_index("idx_task_user_status", "task", ["user_id", "is_complete"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_task_user_status", table_name="task")
    op.drop_index(op.f("ix_task_user_id"), table_name="task")
    op.drop_index(op.f("ix_task_id"), table_name="task")
    op.drop_table("task")
    op.drop_index(op.f("ix_user_id"), table_name="user")
    op.drop_index(op.f("ix_user_email"), table_name="user")
    op.drop_table("user")
