import logging
from collections.abc import Generator, Iterable
from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

engine = create_engine(settings.database_url, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


@dataclass(frozen=True)
class LegacyColumnSpec:
    table_name: str
    column_name: str
    add_statement: str
    backfill_statement: str | None = None
    set_not_null_statement: str | None = None


PROJECT_COLUMN_SPECS: tuple[LegacyColumnSpec, ...] = (
    LegacyColumnSpec(
        table_name="projects",
        column_name="CreatedDate",
        add_statement='ALTER TABLE projects ADD COLUMN "CreatedDate" DATE DEFAULT CURRENT_DATE',
        backfill_statement='UPDATE projects SET "CreatedDate" = CURRENT_DATE WHERE "CreatedDate" IS NULL',
        set_not_null_statement='ALTER TABLE projects ALTER COLUMN "CreatedDate" SET NOT NULL',
    ),
    LegacyColumnSpec(
        table_name="projects",
        column_name="CalendarName",
        add_statement="ALTER TABLE projects ADD COLUMN \"CalendarName\" VARCHAR(150) DEFAULT ''",
        backfill_statement='UPDATE projects SET "CalendarName" = \'\' WHERE "CalendarName" IS NULL',
        set_not_null_statement='ALTER TABLE projects ALTER COLUMN "CalendarName" SET NOT NULL',
    ),
    LegacyColumnSpec(
        table_name="projects",
        column_name="PlannerImportMetadata",
        add_statement="ALTER TABLE projects ADD COLUMN \"PlannerImportMetadata\" TEXT DEFAULT ''",
        backfill_statement='UPDATE projects SET "PlannerImportMetadata" = \'\' WHERE "PlannerImportMetadata" IS NULL',
        set_not_null_statement='ALTER TABLE projects ALTER COLUMN "PlannerImportMetadata" SET NOT NULL',
    ),
)

TASK_COLUMN_SPECS: tuple[LegacyColumnSpec, ...] = (
    LegacyColumnSpec(
        table_name="tasks",
        column_name="OutlineLevel",
        add_statement='ALTER TABLE tasks ADD COLUMN "OutlineLevel" INTEGER DEFAULT 1',
        backfill_statement='UPDATE tasks SET "OutlineLevel" = 1 WHERE "OutlineLevel" IS NULL',
        set_not_null_statement='ALTER TABLE tasks ALTER COLUMN "OutlineLevel" SET NOT NULL',
    ),
    LegacyColumnSpec(
        table_name="tasks",
        column_name="OutlineNumber",
        add_statement="ALTER TABLE tasks ADD COLUMN \"OutlineNumber\" VARCHAR(50) DEFAULT ''",
        backfill_statement='UPDATE tasks SET "OutlineNumber" = \'\' WHERE "OutlineNumber" IS NULL',
        set_not_null_statement='ALTER TABLE tasks ALTER COLUMN "OutlineNumber" SET NOT NULL',
    ),
    LegacyColumnSpec(
        table_name="tasks",
        column_name="WBS",
        add_statement="ALTER TABLE tasks ADD COLUMN \"WBS\" VARCHAR(50) DEFAULT ''",
        backfill_statement='UPDATE tasks SET "WBS" = \'\' WHERE "WBS" IS NULL',
        set_not_null_statement='ALTER TABLE tasks ALTER COLUMN "WBS" SET NOT NULL',
    ),
    LegacyColumnSpec(
        table_name="tasks",
        column_name="IsSummary",
        add_statement='ALTER TABLE tasks ADD COLUMN "IsSummary" BOOLEAN DEFAULT FALSE',
        backfill_statement='UPDATE tasks SET "IsSummary" = FALSE WHERE "IsSummary" IS NULL',
        set_not_null_statement='ALTER TABLE tasks ALTER COLUMN "IsSummary" SET NOT NULL',
    ),
    LegacyColumnSpec(
        table_name="tasks",
        column_name="Predecessors",
        add_statement="ALTER TABLE tasks ADD COLUMN \"Predecessors\" TEXT DEFAULT ''",
        backfill_statement='UPDATE tasks SET "Predecessors" = \'\' WHERE "Predecessors" IS NULL',
        set_not_null_statement='ALTER TABLE tasks ALTER COLUMN "Predecessors" SET NOT NULL',
    ),
    LegacyColumnSpec(
        table_name="tasks",
        column_name="BucketName",
        add_statement="ALTER TABLE tasks ADD COLUMN \"BucketName\" VARCHAR(150) DEFAULT ''",
        backfill_statement='UPDATE tasks SET "BucketName" = \'\' WHERE "BucketName" IS NULL',
        set_not_null_statement='ALTER TABLE tasks ALTER COLUMN "BucketName" SET NOT NULL',
    ),
    LegacyColumnSpec(
        table_name="tasks",
        column_name="LabelsJson",
        add_statement="ALTER TABLE tasks ADD COLUMN \"LabelsJson\" TEXT DEFAULT '[]'",
        backfill_statement='UPDATE tasks SET "LabelsJson" = \'[]\' WHERE "LabelsJson" IS NULL',
        set_not_null_statement='ALTER TABLE tasks ALTER COLUMN "LabelsJson" SET NOT NULL',
    ),
    LegacyColumnSpec(
        table_name="tasks",
        column_name="ChecklistItemsJson",
        add_statement="ALTER TABLE tasks ADD COLUMN \"ChecklistItemsJson\" TEXT DEFAULT '[]'",
        backfill_statement='UPDATE tasks SET "ChecklistItemsJson" = \'[]\' WHERE "ChecklistItemsJson" IS NULL',
        set_not_null_statement='ALTER TABLE tasks ALTER COLUMN "ChecklistItemsJson" SET NOT NULL',
    ),
    LegacyColumnSpec(
        table_name="tasks",
        column_name="CompletedChecklistItemsJson",
        add_statement="ALTER TABLE tasks ADD COLUMN \"CompletedChecklistItemsJson\" TEXT DEFAULT '[]'",
        backfill_statement='UPDATE tasks SET "CompletedChecklistItemsJson" = \'[]\' WHERE "CompletedChecklistItemsJson" IS NULL',
        set_not_null_statement='ALTER TABLE tasks ALTER COLUMN "CompletedChecklistItemsJson" SET NOT NULL',
    ),
)

IMPORT_EVENT_COLUMN_SPECS: tuple[LegacyColumnSpec, ...] = (
    LegacyColumnSpec(
        table_name="import_events",
        column_name="correlation_id",
        add_statement="ALTER TABLE import_events ADD COLUMN correlation_id VARCHAR(64) DEFAULT ''",
        backfill_statement="UPDATE import_events SET correlation_id = '' WHERE correlation_id IS NULL",
        set_not_null_statement="ALTER TABLE import_events ALTER COLUMN correlation_id SET NOT NULL",
    ),
    LegacyColumnSpec(
        table_name="import_events",
        column_name="failure_reason",
        add_statement="ALTER TABLE import_events ADD COLUMN failure_reason VARCHAR(255) DEFAULT ''",
        backfill_statement="UPDATE import_events SET failure_reason = '' WHERE failure_reason IS NULL",
        set_not_null_statement="ALTER TABLE import_events ALTER COLUMN failure_reason SET NOT NULL",
    ),
    LegacyColumnSpec(
        table_name="import_events",
        column_name="technical_details",
        add_statement="ALTER TABLE import_events ADD COLUMN technical_details TEXT DEFAULT ''",
        backfill_statement="UPDATE import_events SET technical_details = '' WHERE technical_details IS NULL",
        set_not_null_statement="ALTER TABLE import_events ALTER COLUMN technical_details SET NOT NULL",
    ),
)


def execute_sql(connection: Connection, statement: str) -> None:
    connection.execute(text(statement))


def table_exists(connection: Connection, table_name: str) -> bool:
    return table_name in inspect(connection).get_table_names()


def current_columns(connection: Connection, table_name: str) -> set[str]:
    return {column["name"] for column in inspect(connection).get_columns(table_name)}


def supports_alter_column_not_null(connection: Connection) -> bool:
    return connection.dialect.name == "postgresql"


def ensure_legacy_columns(connection: Connection, specs: Iterable[LegacyColumnSpec]) -> None:
    specs = tuple(specs)
    if not specs:
        return

    table_name = specs[0].table_name
    if not table_exists(connection, table_name):
        return

    existing_columns = current_columns(connection, table_name)
    for spec in specs:
        if spec.column_name in existing_columns:
            continue
        logger.info('Adding missing column %s."%s".', spec.table_name, spec.column_name)
        execute_sql(connection, spec.add_statement)

    refreshed_columns = current_columns(connection, table_name)
    available_specs = [spec for spec in specs if spec.column_name in refreshed_columns]
    for spec in available_specs:
        if spec.backfill_statement:
            execute_sql(connection, spec.backfill_statement)

    if supports_alter_column_not_null(connection):
        for spec in available_specs:
            if spec.set_not_null_statement:
                execute_sql(connection, spec.set_not_null_statement)


def ensure_legacy_schema_columns() -> None:
    with engine.begin() as connection:
        ensure_legacy_columns(connection, PROJECT_COLUMN_SPECS)
        ensure_legacy_columns(connection, TASK_COLUMN_SPECS)
        ensure_legacy_columns(connection, IMPORT_EVENT_COLUMN_SPECS)

        if connection.dialect.name == "postgresql":
            for table_name, column_name in (
                ("import_events", "import_event_id"),
                ("projects", "ProjectUID"),
                ("tasks", "TaskUID"),
                ("team_members", "member_id"),
                ("managers", "manager_id"),
            ):
                if table_exists(connection, table_name):
                    sync_postgres_sequence(connection, table_name, column_name)


def initialize_database_schema() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_legacy_schema_columns()


def sync_postgres_sequence(connection: Connection, table_name: str, column_name: str) -> None:
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
