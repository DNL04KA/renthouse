"""add_listing_type_sale_price_sold_status

Revision ID: e9622943bd40
Revises: 32aed9e4a786
Create Date: 2026-05-06 10:31:17.714103

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e9622943bd40'
down_revision: Union[str, None] = '32aed9e4a786'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type first, then add column with default so existing rows get a value
    listingtype = sa.Enum('rent', 'sale', name='listingtype')
    listingtype.create(op.get_bind(), checkfirst=True)

    op.add_column('properties', sa.Column(
        'listing_type',
        sa.Enum('rent', 'sale', name='listingtype'),
        nullable=False,
        server_default='rent',
    ))
    op.add_column('properties', sa.Column('sale_price', sa.Numeric(precision=14, scale=2), nullable=True))

    # Add 'sold' to propertystatus enum
    op.execute("ALTER TYPE propertystatus ADD VALUE IF NOT EXISTS 'sold'")


def downgrade() -> None:
    op.drop_column('properties', 'sale_price')
    op.drop_column('properties', 'listing_type')
    op.execute("DROP TYPE IF EXISTS listingtype")
