# Foundry Export Preparation

This document outlines a practical starting workflow for moving the current PostgreSQL-backed app data into Foundry using CSV snapshots.

Use this together with:
- [database-schema.md](/c:/_Code/react-project-tracker-sql/docs/database-schema.md)
- [foundry-ontology-mapping.md](/c:/_Code/react-project-tracker-sql/docs/foundry-ontology-mapping.md)

## Recommendation: Reseed Before the First Foundry Export

For a first clean Foundry import, reseeding is recommended.

Why:
- the local database likely contains ad hoc manual test records
- import history may include debugging and validation artifacts
- a controlled seed gives you predictable primary keys and cleaner first object sets

Use the current database as-is only if you explicitly want a messy but realistic snapshot of active development data.

## Ideal First Export Dataset

Recommended first-pass data shape:

### Keep
- seeded projects
- seeded tasks
- seeded managers
- seeded team members
- seeded user access
- seeded user settings
- seeded import events if you want to model audit history in Foundry

### Optionally Add After Reseed
- 1 manually created project
- 1 successfully imported XML project
- 1 failed import event

This gives you:
- baseline operational data
- at least one example of manual entry
- at least one example of imported data
- at least one example of failure/audit behavior

## Suggested Workflow

### 1. Reset to a known good state

```powershell
npm run backend:seed
```

### 2. Optionally add a small number of curated examples

Examples:
- create one manual project in the UI
- import one sample XML file
- trigger one controlled failed import

### 3. Export the tables to CSV

```powershell
.\backend\.venv\Scripts\python.exe backend\scripts\export_foundry_csv.py
```

Default output directory:

```text
exports/foundry/
```

### 4. Upload CSVs into Foundry datasets

Recommended upload order:
1. `projects.csv`
2. `tasks.csv`
3. `import_events.csv`
4. `managers.csv`
5. `team_members.csv`
6. `user_access.csv`
7. `user_settings.csv`

## Export Script

The repository now includes:

- [export_foundry_csv.py](/c:/_Code/react-project-tracker-sql/backend/scripts/export_foundry_csv.py)

What it does:
- connects to the configured PostgreSQL database
- exports the main application tables
- writes one CSV per table
- sorts rows by primary key where possible for cleaner deterministic output

Example with a custom output directory:

```powershell
.\backend\.venv\Scripts\python.exe backend\scripts\export_foundry_csv.py --output-dir exports/foundry-clean
```

## Tables to Export First

### Ready Now

These tables already have good PK/FK structure for a first Foundry import:

- `projects`
- `tasks`
- `import_events`

Why these are strongest:
- `projects.ProjectUID` is a stable primary key
- `tasks.TaskUID` is a stable primary key
- `tasks.ProjectUID` is a real foreign key to `projects`
- `import_events.import_event_id` is a stable primary key
- `import_events.project_uid` can link back to `projects`

### Useful Supporting Tables

- `managers`
- `team_members`
- `user_access`
- `user_settings`

These are useful for reference and admin context, but they are not as relationship-rich as the core project/task model.

## Foundry Upload Priority

### Minimum Viable Ontology

Start with:
- `projects.csv`
- `tasks.csv`

Create:
- `Project` object type
- `Task` object type
- link `Task -> Project` using `ProjectUID`

### Next Layer

Add:
- `import_events.csv`

Create:
- `Import Event` object type
- optional link `Import Event -> Project` using `project_uid`

### Later

Add:
- `managers.csv`
- `team_members.csv`
- `user_access.csv`
- `user_settings.csv`

These are often better handled after the core business model is working.

## Data Cleanup Guidance

### Good candidates to keep
- real project names
- real task hierarchies
- import audit rows with correlation IDs
- representative admin access rows

### Good candidates to avoid in a first polished export
- duplicate experimentation rows
- temporary debug records
- confusing placeholder-only projects
- excessive failed import noise

## Important Modeling Note

The current schema still contains some string-based relationships that are less ideal for Foundry:

- `projects.ProjectManager`
- `tasks.ResourceNames`
- `tasks.Predecessors`

These can still be exported, but they are not yet strict relational links.

So for a first CSV-based Foundry import:
- treat them as plain properties
- build the strong object/link model first around:
  - `projects`
  - `tasks`
  - `import_events`

Then normalize people/dependency relationships later if needed.

## Recommended Next Step After the First Export

After your first Foundry upload succeeds:

1. verify `Project` object creation
2. verify `Task` object creation
3. verify `Task -> Project` links
4. verify no duplicate primary keys
5. verify `Import Event -> Project` links
6. decide whether to normalize people and dependencies before the next iteration
