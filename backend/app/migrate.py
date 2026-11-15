from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import inspect, MetaData

from . import db as dbmod
from .db import Base
from . import models  # noqa: F401

BASELINE = '20261110_01'


def configuration(connection):
    root = Path(__file__).resolve().parent.parent
    cfg = Config(str(root / 'alembic.ini'))
    cfg.set_main_option('script_location', str(root / 'alembic'))
    cfg.attributes['connection'] = connection
    return cfg


def upgrade():
    with dbmod.engine.begin() as connection:
        cfg = configuration(connection)
        names = set(inspect(connection).get_table_names())
        if 'alembic_version' not in names and names & set(Base.metadata.tables):
            baseline = MetaData()
            for table in Base.metadata.sorted_tables:
                if table.name != "auth_rate_buckets":
                    frozen = table.to_metadata(baseline)
                    later_columns = {"bookings": ("booked_facilities", "booked_rules"), "content_items": ("announcement_sent_at",)}
                    for name in later_columns.get(table.name, ()):
                        frozen._columns.remove(frozen.c[name])
                    later_indexes = {"ix_bookings_confirmed_ends_at"}
                    for index in [i for i in frozen.indexes if i.name in later_indexes]:
                        frozen.indexes.discard(index)
            differences = compare_metadata(MigrationContext.configure(connection), baseline)
            if differences:
                raise RuntimeError('Schema cũ chưa khớp bản nền. Hãy sao lưu và đối chiếu schema trước khi nâng cấp; dữ liệu chưa bị thay đổi.')
            command.stamp(cfg, BASELINE)
        command.upgrade(cfg, 'head')


if __name__ == '__main__':
    with dbmod.init_lock():
        upgrade()
