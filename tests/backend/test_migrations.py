from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect, text
import pytest

from app import db, migrate
from app.db import Base


def test_empty_database_upgrade_and_downgrade(tmp_path, monkeypatch):
    engine = create_engine(f'sqlite:///{tmp_path / "migration.db"}')
    monkeypatch.setattr(db, 'engine', engine)
    migrate.upgrade()
    with engine.begin() as connection:
        assert compare_metadata(MigrationContext.configure(connection), Base.metadata) == []
        assert connection.scalar(text('SELECT version_num FROM alembic_version')) == '20261111_04'
        command.downgrade(migrate.configuration(connection), 'base')
        assert set(inspect(connection).get_table_names()) <= {'alembic_version'}
    engine.dispose()


def test_legacy_schema_preserves_data(tmp_path, monkeypatch):
    engine = create_engine(f'sqlite:///{tmp_path / "legacy.db"}')
    with engine.begin() as connection:
        command.upgrade(migrate.configuration(connection), migrate.BASELINE)
        connection.execute(text("DROP TABLE alembic_version"))
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO system_settings (key, value, updated_date) VALUES ('hold_minutes', '17', CURRENT_TIMESTAMP)"))
    monkeypatch.setattr(db, 'engine', engine)
    migrate.upgrade()
    migrate.upgrade()
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT value FROM system_settings WHERE key='hold_minutes'")) == 17
    engine.dispose()


def test_partial_legacy_schema_is_not_stamped(tmp_path, monkeypatch):
    engine = create_engine(f'sqlite:///{tmp_path / "partial.db"}')
    Base.metadata.tables['system_settings'].create(engine)
    monkeypatch.setattr(db, 'engine', engine)
    with pytest.raises(RuntimeError, match='Schema'):
        migrate.upgrade()
    assert 'alembic_version' not in inspect(engine).get_table_names()
    engine.dispose()

def test_existing_database_upgrades_without_losing_business_data():
    with db.engine.begin() as connection:
        before=connection.scalar(text('SELECT count(*) FROM users'))
        command.downgrade(migrate.configuration(connection), migrate.BASELINE)
        connection.execute(text('DROP TABLE alembic_version'))
        connection.execute(text("INSERT INTO system_settings (key,value,updated_date) VALUES ('hold_minutes','17',CURRENT_TIMESTAMP)"))
    migrate.upgrade()
    with db.engine.connect() as connection:
        assert connection.scalar(text('SELECT count(*) FROM users'))==before
        assert str(connection.scalar(text("SELECT value FROM system_settings WHERE key='hold_minutes'")))=='17'
        assert compare_metadata(MigrationContext.configure(connection),Base.metadata)==[]
