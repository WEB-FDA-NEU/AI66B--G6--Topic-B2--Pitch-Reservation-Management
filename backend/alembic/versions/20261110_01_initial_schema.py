from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '20261110_01'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('audit_events',
    sa.Column('actor_id', sa.String(length=64), nullable=False),
    sa.Column('actor_name', sa.String(length=120), nullable=True),
    sa.Column('actor_email', sa.String(length=255), nullable=True),
    sa.Column('actor_role', sa.String(length=20), nullable=True),
    sa.Column('action', sa.String(length=40), nullable=False),
    sa.Column('entity_type', sa.String(length=40), nullable=True),
    sa.Column('entity_id', sa.String(length=64), nullable=True),
    sa.Column('target_name', sa.String(length=300), nullable=True),
    sa.Column('target_email', sa.String(length=255), nullable=True),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('content_items',
    sa.Column('title', sa.String(length=300), nullable=False),
    sa.Column('type', sa.String(length=30), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('cta_label', sa.String(length=100), nullable=True),
    sa.Column('cta_link', sa.String(length=500), nullable=True),
    sa.Column('created_by_name', sa.String(length=120), nullable=True),
    sa.Column('published_at', sa.DateTime(), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('conversations',
    sa.Column('kind', sa.String(length=20), nullable=False),
    sa.Column('customer_id', sa.String(length=64), nullable=False),
    sa.Column('customer_name', sa.String(length=120), nullable=True),
    sa.Column('manager_id', sa.String(length=64), nullable=False),
    sa.Column('manager_name', sa.String(length=120), nullable=True),
    sa.Column('pitch_id', sa.String(length=64), nullable=False),
    sa.Column('pitch_name', sa.String(length=200), nullable=True),
    sa.Column('last_message', sa.Text(), nullable=True),
    sa.Column('last_message_at', sa.DateTime(), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('customer_id', 'manager_id', 'pitch_id', name='uq_conversation')
    )
    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_conversations_customer_id'), ['customer_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_conversations_manager_id'), ['manager_id'], unique=False)

    op.create_table('reports',
    sa.Column('target_type', sa.String(length=20), nullable=False),
    sa.Column('target_id', sa.String(length=64), nullable=False),
    sa.Column('target_name', sa.String(length=200), nullable=True),
    sa.Column('reporter_id', sa.String(length=64), nullable=False),
    sa.Column('reporter_name', sa.String(length=120), nullable=True),
    sa.Column('reporter_role', sa.String(length=20), nullable=True),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('details', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('decision', sa.Text(), nullable=True),
    sa.Column('assigned_to', sa.String(length=64), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('reports', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_reports_reporter_id'), ['reporter_id'], unique=False)

    op.create_table('system_settings',
    sa.Column('key', sa.String(length=60), nullable=False),
    sa.Column('value', sa.JSON(), nullable=False),
    sa.Column('updated_by_name', sa.String(length=120), nullable=True),
    sa.Column('updated_date', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_table('users',
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('phone', sa.String(length=30), nullable=False),
    sa.Column('app_role', sa.String(length=20), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('must_change_password', sa.Boolean(), nullable=False),
    sa.Column('preferences', sa.JSON(), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=True)

    op.create_table('warnings',
    sa.Column('recipient_id', sa.String(length=64), nullable=False),
    sa.Column('issuer_id', sa.String(length=64), nullable=False),
    sa.Column('issuer_name', sa.String(length=120), nullable=True),
    sa.Column('issuer_role', sa.String(length=20), nullable=True),
    sa.Column('reason', sa.Text(), nullable=False),
    sa.Column('conversation_id', sa.String(length=64), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('warnings', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_warnings_issuer_id'), ['issuer_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_warnings_recipient_id'), ['recipient_id'], unique=False)

    op.create_table('messages',
    sa.Column('conversation_id', sa.String(length=64), nullable=False),
    sa.Column('customer_id', sa.String(length=64), nullable=False),
    sa.Column('manager_id', sa.String(length=64), nullable=False),
    sa.Column('sender_id', sa.String(length=64), nullable=False),
    sa.Column('sender_name', sa.String(length=120), nullable=True),
    sa.Column('sender_role', sa.String(length=20), nullable=True),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_messages_conversation_id'), ['conversation_id'], unique=False)

    op.create_table('notifications',
    sa.Column('recipient_id', sa.String(length=64), nullable=False),
    sa.Column('title', sa.String(length=300), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('link', sa.String(length=500), nullable=True),
    sa.Column('read', sa.Boolean(), nullable=False),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notifications_recipient_id'), ['recipient_id'], unique=False)

    op.create_table('pitches',
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('type', sa.String(length=20), nullable=True),
    sa.Column('base_price_vnd', sa.Integer(), nullable=False),
    sa.Column('city', sa.String(length=100), nullable=True),
    sa.Column('district', sa.String(length=100), nullable=True),
    sa.Column('address', sa.String(length=300), nullable=False),
    sa.Column('open_time', sa.String(length=5), nullable=True),
    sa.Column('close_time', sa.String(length=5), nullable=True),
    sa.Column('facilities', sa.JSON(), nullable=True),
    sa.Column('rules', sa.Text(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('images', sa.JSON(), nullable=True),
    sa.Column('manager_id', sa.String(length=64), nullable=False),
    sa.Column('manager_name', sa.String(length=120), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('slot_minutes', sa.Integer(), nullable=False),
    sa.Column('schedule_configured', sa.Boolean(), nullable=False),
    sa.Column('creation_request_id', sa.String(length=100), nullable=True),
    sa.Column('pause_reason', sa.Text(), nullable=True),
    sa.Column('status_changed_at', sa.DateTime(), nullable=True),
    sa.Column('suspension', sa.JSON(), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['manager_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('manager_id', 'creation_request_id', name='uq_pitch_creation_request')
    )
    with op.batch_alter_table('pitches', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_pitches_manager_id'), ['manager_id'], unique=False)

    op.create_table('sessions',
    sa.Column('token_hash', sa.String(length=128), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('token_hash')
    )
    with op.batch_alter_table('sessions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_sessions_user_id'), ['user_id'], unique=False)

    op.create_table('wallets',
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('balance_vnd', sa.Integer(), nullable=False),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_table('warning_responses',
    sa.Column('warning_id', sa.String(length=64), nullable=False),
    sa.Column('author_id', sa.String(length=64), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['warning_id'], ['warnings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('warning_responses', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_warning_responses_warning_id'), ['warning_id'], unique=False)

    op.create_table('availability_overrides',
    sa.Column('pitch_id', sa.String(length=64), nullable=False),
    sa.Column('manager_id', sa.String(length=64), nullable=False),
    sa.Column('local_date', sa.String(length=10), nullable=False),
    sa.Column('start_time', sa.String(length=5), nullable=False),
    sa.Column('end_time', sa.String(length=5), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['pitch_id'], ['pitches.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('availability_overrides', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_availability_overrides_local_date'), ['local_date'], unique=False)
        batch_op.create_index(batch_op.f('ix_availability_overrides_pitch_id'), ['pitch_id'], unique=False)

    op.create_table('bookings',
    sa.Column('code', sa.String(length=12), nullable=False),
    sa.Column('pitch_id', sa.String(length=64), nullable=False),
    sa.Column('pitch_name', sa.String(length=200), nullable=True),
    sa.Column('pitch_type', sa.String(length=20), nullable=True),
    sa.Column('pitch_address', sa.String(length=300), nullable=True),
    sa.Column('manager_id', sa.String(length=64), nullable=False),
    sa.Column('customer_id', sa.String(length=64), nullable=False),
    sa.Column('customer_name', sa.String(length=120), nullable=True),
    sa.Column('local_date', sa.String(length=10), nullable=False),
    sa.Column('start_time', sa.String(length=5), nullable=False),
    sa.Column('slot_starts', sa.JSON(), nullable=False),
    sa.Column('slot_label', sa.String(length=20), nullable=False),
    sa.Column('starts_at', sa.DateTime(), nullable=False),
    sa.Column('ends_at', sa.DateTime(), nullable=False),
    sa.Column('amount_vnd', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('payment_status', sa.String(length=20), nullable=False),
    sa.Column('hold_expires_at', sa.DateTime(), nullable=True),
    sa.Column('paid_at', sa.DateTime(), nullable=True),
    sa.Column('cancel_type', sa.String(length=30), nullable=True),
    sa.Column('cancel_reason', sa.Text(), nullable=True),
    sa.Column('cancelled_by', sa.String(length=20), nullable=True),
    sa.Column('cancelled_at', sa.DateTime(), nullable=True),
    sa.Column('reschedule_count', sa.Integer(), nullable=False),
    sa.Column('reschedule_from_id', sa.String(length=64), nullable=True),
    sa.Column('rescheduled_to_id', sa.String(length=64), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['customer_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['pitch_id'], ['pitches.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code')
    )
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_bookings_customer_id'), ['customer_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_bookings_local_date'), ['local_date'], unique=False)
        batch_op.create_index(batch_op.f('ix_bookings_manager_id'), ['manager_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_bookings_pitch_id'), ['pitch_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_bookings_reschedule_from_id'), ['reschedule_from_id'], unique=False)
        batch_op.create_index('uq_one_pending_hold_per_customer', ['customer_id'], unique=True, sqlite_where=sa.text("status = 'pending'"), postgresql_where=sa.text("status = 'pending'"))

    op.create_table('favorites',
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('pitch_id', sa.String(length=64), nullable=False),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['pitch_id'], ['pitches.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'pitch_id', name='uq_favorite')
    )
    with op.batch_alter_table('favorites', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_favorites_user_id'), ['user_id'], unique=False)

    op.create_table('pitch_schedules',
    sa.Column('pitch_id', sa.String(length=64), nullable=False),
    sa.Column('manager_id', sa.String(length=64), nullable=False),
    sa.Column('weekday', sa.Integer(), nullable=False),
    sa.Column('local_start', sa.String(length=5), nullable=False),
    sa.Column('local_end', sa.String(length=5), nullable=False),
    sa.Column('price_vnd', sa.Integer(), nullable=False),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['pitch_id'], ['pitches.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('pitch_schedules', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_pitch_schedules_pitch_id'), ['pitch_id'], unique=False)

    op.create_table('wallet_transactions',
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('wallet_id', sa.String(length=64), nullable=False),
    sa.Column('user_id', sa.String(length=64), nullable=False),
    sa.Column('amount_vnd', sa.Integer(), nullable=False),
    sa.Column('balance_after_vnd', sa.Integer(), nullable=False),
    sa.Column('kind', sa.String(length=30), nullable=False),
    sa.Column('booking_id', sa.String(length=64), nullable=True),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['wallet_id'], ['wallets.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('wallet_transactions', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_wallet_transactions_booking_id'), ['booking_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_wallet_transactions_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_wallet_transactions_wallet_id'), ['wallet_id'], unique=False)

    op.create_table('booking_slots',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('booking_id', sa.String(length=64), nullable=False),
    sa.Column('pitch_id', sa.String(length=64), nullable=False),
    sa.Column('local_date', sa.String(length=10), nullable=False),
    sa.Column('start_time', sa.String(length=5), nullable=False),
    sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('pitch_id', 'local_date', 'start_time', name='uq_slot_taken')
    )
    with op.batch_alter_table('booking_slots', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_booking_slots_booking_id'), ['booking_id'], unique=False)

    op.create_table('payments',
    sa.Column('booking_id', sa.String(length=64), nullable=False),
    sa.Column('customer_id', sa.String(length=64), nullable=False),
    sa.Column('manager_id', sa.String(length=64), nullable=False),
    sa.Column('pitch_id', sa.String(length=64), nullable=True),
    sa.Column('amount_vnd', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('paid_at', sa.DateTime(), nullable=True),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_payments_booking_id'), ['booking_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_payments_customer_id'), ['customer_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_payments_manager_id'), ['manager_id'], unique=False)

    op.create_table('reviews',
    sa.Column('booking_id', sa.String(length=64), nullable=False),
    sa.Column('pitch_id', sa.String(length=64), nullable=False),
    sa.Column('customer_id', sa.String(length=64), nullable=False),
    sa.Column('customer_name', sa.String(length=120), nullable=True),
    sa.Column('rating', sa.Integer(), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('booking_id')
    )
    with op.batch_alter_table('reviews', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_reviews_pitch_id'), ['pitch_id'], unique=False)

    op.create_table('refunds',
    sa.Column('booking_id', sa.String(length=64), nullable=False),
    sa.Column('payment_id', sa.String(length=64), nullable=False),
    sa.Column('customer_id', sa.String(length=64), nullable=False),
    sa.Column('manager_id', sa.String(length=64), nullable=False),
    sa.Column('amount_vnd', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('id', sa.String(length=64), nullable=False),
    sa.Column('created_date', sa.DateTime(), nullable=False),
    sa.Column('updated_date', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ),
    sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('payment_id')
    )
    with op.batch_alter_table('refunds', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_refunds_booking_id'), ['booking_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_refunds_customer_id'), ['customer_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_refunds_manager_id'), ['manager_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('refunds', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_refunds_manager_id'))
        batch_op.drop_index(batch_op.f('ix_refunds_customer_id'))
        batch_op.drop_index(batch_op.f('ix_refunds_booking_id'))

    op.drop_table('refunds')
    with op.batch_alter_table('reviews', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_reviews_pitch_id'))

    op.drop_table('reviews')
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_payments_manager_id'))
        batch_op.drop_index(batch_op.f('ix_payments_customer_id'))
        batch_op.drop_index(batch_op.f('ix_payments_booking_id'))

    op.drop_table('payments')
    with op.batch_alter_table('booking_slots', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_booking_slots_booking_id'))

    op.drop_table('booking_slots')
    with op.batch_alter_table('wallet_transactions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_wallet_transactions_wallet_id'))
        batch_op.drop_index(batch_op.f('ix_wallet_transactions_user_id'))
        batch_op.drop_index(batch_op.f('ix_wallet_transactions_booking_id'))

    op.drop_table('wallet_transactions')
    with op.batch_alter_table('pitch_schedules', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_pitch_schedules_pitch_id'))

    op.drop_table('pitch_schedules')
    with op.batch_alter_table('favorites', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_favorites_user_id'))

    op.drop_table('favorites')
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.drop_index('uq_one_pending_hold_per_customer', sqlite_where=sa.text("status = 'pending'"), postgresql_where=sa.text("status = 'pending'"))
        batch_op.drop_index(batch_op.f('ix_bookings_reschedule_from_id'))
        batch_op.drop_index(batch_op.f('ix_bookings_pitch_id'))
        batch_op.drop_index(batch_op.f('ix_bookings_manager_id'))
        batch_op.drop_index(batch_op.f('ix_bookings_local_date'))
        batch_op.drop_index(batch_op.f('ix_bookings_customer_id'))

    op.drop_table('bookings')
    with op.batch_alter_table('availability_overrides', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_availability_overrides_pitch_id'))
        batch_op.drop_index(batch_op.f('ix_availability_overrides_local_date'))

    op.drop_table('availability_overrides')
    with op.batch_alter_table('warning_responses', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_warning_responses_warning_id'))

    op.drop_table('warning_responses')
    op.drop_table('wallets')
    with op.batch_alter_table('sessions', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_sessions_user_id'))

    op.drop_table('sessions')
    with op.batch_alter_table('pitches', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_pitches_manager_id'))

    op.drop_table('pitches')
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_recipient_id'))

    op.drop_table('notifications')
    with op.batch_alter_table('messages', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_messages_conversation_id'))

    op.drop_table('messages')
    with op.batch_alter_table('warnings', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_warnings_recipient_id'))
        batch_op.drop_index(batch_op.f('ix_warnings_issuer_id'))

    op.drop_table('warnings')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_email'))

    op.drop_table('users')
    op.drop_table('system_settings')
    with op.batch_alter_table('reports', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_reports_reporter_id'))

    op.drop_table('reports')
    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_conversations_manager_id'))
        batch_op.drop_index(batch_op.f('ix_conversations_customer_id'))

    op.drop_table('conversations')
    op.drop_table('content_items')
    op.drop_table('audit_events')
