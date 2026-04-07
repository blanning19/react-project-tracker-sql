import logging
from collections.abc import Generator

from fastapi import HTTPException
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
        if "PlannerImportMetadata" not in project_columns:
            logger.info('Adding missing column projects."PlannerImportMetadata".')
            connection.execute(text("ALTER TABLE projects ADD COLUMN \"PlannerImportMetadata\" TEXT DEFAULT ''"))
            connection.execute(
                text(
                    'UPDATE projects SET "PlannerImportMetadata" = \'\' '
                    'WHERE "PlannerImportMetadata" IS NULL'
                )
            )
            connection.execute(text('ALTER TABLE projects ALTER COLUMN "PlannerImportMetadata" SET NOT NULL'))

        task_columns = {column["name"] for column in inspector.get_columns("tasks")}
        task_column_statements = {
            "OutlineLevel": 'ALTER TABLE tasks ADD COLUMN "OutlineLevel" INTEGER DEFAULT 1',
            "OutlineNumber": "ALTER TABLE tasks ADD COLUMN \"OutlineNumber\" VARCHAR(50) DEFAULT ''",
            "WBS": "ALTER TABLE tasks ADD COLUMN \"WBS\" VARCHAR(50) DEFAULT ''",
            "IsSummary": 'ALTER TABLE tasks ADD COLUMN "IsSummary" BOOLEAN DEFAULT FALSE',
            "Predecessors": "ALTER TABLE tasks ADD COLUMN \"Predecessors\" TEXT DEFAULT ''",
            "BucketName": "ALTER TABLE tasks ADD COLUMN \"BucketName\" VARCHAR(150) DEFAULT ''",
            "LabelsJson": "ALTER TABLE tasks ADD COLUMN \"LabelsJson\" TEXT DEFAULT '[]'",
            "ChecklistItemsJson": "ALTER TABLE tasks ADD COLUMN \"ChecklistItemsJson\" TEXT DEFAULT '[]'",
            "CompletedChecklistItemsJson": (
                "ALTER TABLE tasks ADD COLUMN "
                "\"CompletedChecklistItemsJson\" TEXT DEFAULT '[]'"
            ),
        }

        for column_name, statement in task_column_statements.items():
            if column_name not in task_columns:
                logger.info('Adding missing column tasks."%s".', column_name)
                connection.execute(text(statement))

        refreshed_task_columns = {column["name"] for column in inspect(connection).get_columns("tasks")}
        if {
            "OutlineLevel",
            "OutlineNumber",
            "WBS",
            "IsSummary",
            "Predecessors",
            "BucketName",
            "LabelsJson",
            "ChecklistItemsJson",
            "CompletedChecklistItemsJson",
        }.issubset(refreshed_task_columns):
            connection.execute(text('UPDATE tasks SET "OutlineLevel" = 1 WHERE "OutlineLevel" IS NULL'))
            connection.execute(text('UPDATE tasks SET "OutlineNumber" = \'\' WHERE "OutlineNumber" IS NULL'))
            connection.execute(text('UPDATE tasks SET "WBS" = \'\' WHERE "WBS" IS NULL'))
            connection.execute(text('UPDATE tasks SET "IsSummary" = FALSE WHERE "IsSummary" IS NULL'))
            connection.execute(text('UPDATE tasks SET "Predecessors" = \'\' WHERE "Predecessors" IS NULL'))
            connection.execute(text('UPDATE tasks SET "BucketName" = \'\' WHERE "BucketName" IS NULL'))
            connection.execute(text('UPDATE tasks SET "LabelsJson" = \'[]\' WHERE "LabelsJson" IS NULL'))
            connection.execute(
                text('UPDATE tasks SET "ChecklistItemsJson" = \'[]\' WHERE "ChecklistItemsJson" IS NULL')
            )
            connection.execute(
                text(
                    'UPDATE tasks SET "CompletedChecklistItemsJson" = \'[]\' '
                    'WHERE "CompletedChecklistItemsJson" IS NULL'
                )
            )
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "OutlineLevel" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "OutlineNumber" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "WBS" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "IsSummary" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "Predecessors" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "BucketName" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "LabelsJson" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "ChecklistItemsJson" SET NOT NULL'))
            connection.execute(text('ALTER TABLE tasks ALTER COLUMN "CompletedChecklistItemsJson" SET NOT NULL'))

        table_names = set(inspector.get_table_names())
        if "import_events" in table_names:
            import_event_columns = {column["name"] for column in inspector.get_columns("import_events")}
            import_event_column_statements = {
                "correlation_id": "ALTER TABLE import_events ADD COLUMN correlation_id VARCHAR(64) DEFAULT ''",
                "failure_reason": "ALTER TABLE import_events ADD COLUMN failure_reason VARCHAR(255) DEFAULT ''",
                "technical_details": "ALTER TABLE import_events ADD COLUMN technical_details TEXT DEFAULT ''",
            }
            for column_name, statement in import_event_column_statements.items():
                if column_name not in import_event_columns:
                    logger.info('Adding missing column import_events."%s".', column_name)
                    connection.execute(text(statement))

            refreshed_import_event_columns = {
                column["name"] for column in inspect(connection).get_columns("import_events")
            }
            if {"correlation_id", "failure_reason", "technical_details"}.issubset(refreshed_import_event_columns):
                connection.execute(text("UPDATE import_events SET correlation_id = '' WHERE correlation_id IS NULL"))
                connection.execute(text("UPDATE import_events SET failure_reason = '' WHERE failure_reason IS NULL"))
                connection.execute(
                    text("UPDATE import_events SET technical_details = '' WHERE technical_details IS NULL")
                )
                connection.execute(text("ALTER TABLE import_events ALTER COLUMN correlation_id SET NOT NULL"))
                connection.execute(text("ALTER TABLE import_events ALTER COLUMN failure_reason SET NOT NULL"))
                connection.execute(text("ALTER TABLE import_events ALTER COLUMN technical_details SET NOT NULL"))

            if connection.dialect.name == "postgresql":
                sync_postgres_sequence(connection, "import_events", "import_event_id")

        if connection.dialect.name == "postgresql":
            if "projects" in table_names:
                sync_postgres_sequence(connection, "projects", "ProjectUID")
            if "tasks" in table_names:
                sync_postgres_sequence(connection, "tasks", "TaskUID")


def sync_postgres_sequence(connection, table_name: str, column_name: str) -> None:
    sequence_name = connection.scalar(
        text("SELECT pg_get_serial_sequence(:table_name, :column_name)"),
        {"table_name": table_name, "column_name": column_name},
    )
    if not sequence_name:
        return

    connection.execute(
        text(
            f"""
            SELECT setval(
                '{sequence_name}',
                COALESCE((SELECT MAX("{column_name}") FROM {table_name}), 0) + 1,
                false
            )
            """
        )
    )


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Database session rolled back due to an unhandled error.")
        raise
    finally:
        db.close()
