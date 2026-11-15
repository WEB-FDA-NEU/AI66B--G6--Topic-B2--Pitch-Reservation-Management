from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20261111_03'
down_revision: Union[str, Sequence[str], None] = '20261110_02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('booked_facilities', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('booked_rules', sa.Text(), nullable=True))

    with op.batch_alter_table('content_items', schema=None) as batch_op:
        batch_op.add_column(sa.Column('announcement_sent_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('content_items', schema=None) as batch_op:
        batch_op.drop_column('announcement_sent_at')

    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.drop_column('booked_rules')
        batch_op.drop_column('booked_facilities')
