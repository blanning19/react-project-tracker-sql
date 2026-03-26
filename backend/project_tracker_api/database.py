import logging
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def ensure_legacy_schema_columns() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)

        project_columns = {column["name"] for column in inspector.get_columns("projects")}
        if "CreatedDate" not in project_columns:
            logger.info('Adding missing column projects."CreatedDate".')
            connection.execute(text('ALTER TABLE projects ADD COLUMN "CreatedDate" DATE DEFAULT CURRENT_DATE'))
            connection.execute(text('UPDATE projects SET "CreatedDate" = CURRENT_DATE WHERE "CreatedDate" IS NULL'))
            connection.execute(text('ALTER TABLE projects ALTER COLUMN "CreatedDate" SET NOT NULL'))
        if "CalendarName" not in project_columns:
            logger.info('Adding missing column projects."CalendarName".')
            connection.execute(text("ALTER TABLE projects ADD COLUMN \"CalendarName\" VARCHAR(150) DEFAULT ''"))
            connection.execute(text('UPDATE projects SET "CalendarName" = \'\' WHERE "CalendarName" IS NULL'))
            connection.execute(text('ALTER TABLE projects ALTER COLUMN "CalendarName" SET NOT NULL'))

        task_columns = {column["name"] for column in inspector.get_columns("tasks")}
        task_column_statements = {
            "OutlineLevel": 'ALTER TABLE tasks ADD COLUMN "OutlineLevel" INTEGER DEFAULT 1',
            "OutlineNumber": "ALTER TABLE tasks ADD COLUMN \"OutlineNumber\" VARCHAR(50) DEFAULT ''",
            "WBS": "ALTER TABLE tasks ADD COLUMN \"WBS\" VARCHAR(50) DEFAULT ''",
            "IsSummary": 'ALTER TABLE tasks ADD COLUMN "IsSummary" BOOLEAN DEFAULT FALSE',
            "Predecessors": "ALTER TABLE tasks ADD COLUMN \"Predecessors\" TEXT DEFAULT ''",
        }

        for column_name, statement in task_column_statements.items():
            if column_name not in task_columns:
                logger.info('Adding missing column tasks."%s".', column_name)
                connection.execute(text(statement))

        refreshed_task_columns = {column["name"] for column in inspect(connection).get_columns("tasks")}
        if {"OutlineLevel", "OutlineNumber", "WBS", "IsSummary", "Predecessors"}.issubset(refreshed_task_columns):
            connection.execute(text('UPDATE tasks SET "OutlineLevel" = 1 WHERE "OutlineLevel" IS NULL'))
            connection.execute(text('UPDATE tasks SET "OutlineNumber" = \'\' WHERE "OutlineNumber" IS NULL'))
            connection.execute(text('UPDATE tasks SET "WBS" = \'\' WHERE "WBS" IS NULL'))
            connection.execute(text('UPDATE tasks SET "IsSummary" = FALSE WHERE "IsSummary" IS NULL'))
            connection.execute(text('UPDATE tasks SET "Predecessors" = \'\' WHERE "Predecessors" IS NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "OutlineLevel" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "OutlineNumber" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "WBS" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "IsSummary" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "Predecessors" SET NOT NULL'))


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        logger.exception("Database session rolled back due to an unhandled error.")
        raise
    finally:
        db.close()
