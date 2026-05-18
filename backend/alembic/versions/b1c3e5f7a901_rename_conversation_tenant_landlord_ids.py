"""rename conversation tenant_id and landlord_id to tenant_user_id and landlord_user_id

Revision ID: b1c3e5f7a901
Revises: a3b0021f8e53
Create Date: 2026-05-14

"""
from alembic import op

revision = 'b1c3e5f7a901'
down_revision = '7b20d7e90bf0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old FK constraints
    op.drop_constraint('conversations_tenant_id_fkey', 'conversations', type_='foreignkey')
    op.drop_constraint('conversations_landlord_id_fkey', 'conversations', type_='foreignkey')

    # Rename columns
    op.alter_column('conversations', 'tenant_id', new_column_name='tenant_user_id')
    op.alter_column('conversations', 'landlord_id', new_column_name='landlord_user_id')

    # Re-create FK constraints with new names
    op.create_foreign_key(
        'conversations_tenant_user_id_fkey',
        'conversations', 'users',
        ['tenant_user_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'conversations_landlord_user_id_fkey',
        'conversations', 'users',
        ['landlord_user_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_constraint('conversations_tenant_user_id_fkey', 'conversations', type_='foreignkey')
    op.drop_constraint('conversations_landlord_user_id_fkey', 'conversations', type_='foreignkey')

    op.alter_column('conversations', 'tenant_user_id', new_column_name='tenant_id')
    op.alter_column('conversations', 'landlord_user_id', new_column_name='landlord_id')

    op.create_foreign_key(
        'conversations_tenant_id_fkey',
        'conversations', 'users',
        ['tenant_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'conversations_landlord_id_fkey',
        'conversations', 'users',
        ['landlord_id'], ['id'],
        ondelete='CASCADE'
    )
