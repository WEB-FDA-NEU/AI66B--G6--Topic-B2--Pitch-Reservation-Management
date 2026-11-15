from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20261111_04'
down_revision: Union[str, Sequence[str], None] = '20261111_03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_bookings_confirmed_ends_at', 'bookings', ['ends_at'], unique=False,
                    sqlite_where=sa.text("status = 'confirmed'"), postgresql_where=sa.text("status = 'confirmed'"))


def downgrade() -> None:
    op.drop_index('ix_bookings_confirmed_ends_at', table_name='bookings',
                  sqlite_where=sa.text("status = 'confirmed'"), postgresql_where=sa.text("status = 'confirmed'"))
