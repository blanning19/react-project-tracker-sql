from __future__ import annotations

import argparse
import csv
from pathlib import Path

from sqlalchemy import MetaData, Table, create_engine, inspect, select

from project_tracker_api.config import get_settings

EXPORT_TABLES = [
    "projects",
    "tasks",
    "import_events",
    "managers",
    "team_members",
    "user_access",
    "user_settings",
]


def export_table(table: Table, output_path: Path) -> None:
    primary_key_columns = [column.name for column in table.primary_key.columns]
    query = select(table)
    if primary_key_columns:
        query = query.order_by(*(table.c[column_name] for column_name in primary_key_columns))

    with table.metadata.bind.connect() as connection:
        rows = connection.execute(query).mappings().all()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=[column.name for column in table.columns])
        writer.writeheader()
        writer.writerows(rows)


def export_tables(output_dir: Path) -> None:
    settings = get_settings()
    engine = create_engine(settings.database_url, future=True)
    metadata = MetaData()
    metadata.reflect(bind=engine, only=EXPORT_TABLES)
    metadata.bind = engine

    inspector = inspect(engine)
    available_tables = set(inspector.get_table_names())

    for table_name in EXPORT_TABLES:
        if table_name not in available_tables:
            print(f"Skipping missing table: {table_name}")
            continue

        export_table(metadata.tables[table_name], output_dir / f"{table_name}.csv")
        print(f"Exported {table_name} -> {output_dir / f'{table_name}.csv'}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export the Project Tracker PostgreSQL tables to CSV files for Foundry ingestion."
    )
    parser.add_argument(
        "--output-dir",
        default="exports/foundry",
        help="Directory where the CSV files should be written. Default: exports/foundry",
    )
    args = parser.parse_args()
    export_tables(Path(args.output_dir))


if __name__ == "__main__":
    main()
