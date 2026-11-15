from alembic import context
from sqlalchemy import engine_from_config, pool
from app import config
from app.db import Base
from app import models  # noqa: F401

configuration = context.config
configuration.set_main_option('sqlalchemy.url', config.DATABASE_URL.replace('%', '%%'))
target_metadata = Base.metadata

def migrate(connection):
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True, render_as_batch=connection.dialect.name == 'sqlite')
    with context.begin_transaction():
        context.run_migrations()

if context.is_offline_mode():
    context.configure(url=config.DATABASE_URL, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    connection = configuration.attributes.get('connection')
    if connection is not None:
        migrate(connection)
    else:
        engine = engine_from_config(configuration.get_section(configuration.config_ini_section), prefix='sqlalchemy.', poolclass=pool.NullPool)
        with engine.connect() as connection:
            migrate(connection)
