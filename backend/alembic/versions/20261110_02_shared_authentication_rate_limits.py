from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20261110_02'
down_revision: Union[str, Sequence[str], None] = '20261110_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('auth_rate_buckets',
    sa.Column('key', sa.String(length=64), nullable=False),
    sa.Column('attempts', sa.JSON(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('key')
    )
    with op.batch_alter_table('auth_rate_buckets', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_auth_rate_buckets_expires_at'), ['expires_at'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('auth_rate_buckets', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_auth_rate_buckets_expires_at'))

    op.drop_table('auth_rate_buckets')
