# Project Tracker Workspace

Project Tracker is a full-stack project and task tracking workspace with a React frontend and a FastAPI backend. It is designed around project-level visibility, task assignment, dashboard views, and a PostgreSQL-backed API.

The repository uses a monorepo-style structure:

```text
react-project-tracker-sql/
  frontend/
  backend/
  README.md
  package.json
```

## What The App Does

- Displays portfolio-level project data on the Home page
- Shows personalized work on My Dashboard
- Supports project detail views, project editing, and task editing
- Includes a separate Admin area for diagnostics, import auditing, visibility controls, and API documentation links
- Enforces owner vs non-owner behavior on project and task access
- Uses seeded local data for development and UI testing

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- React-Bootstrap
- Bootstrap utility classes plus custom CSS
- ESLint flat config
- Prettier for formatting
- Vitest for frontend unit tests
- Playwright for frontend end-to-end smoke tests

### Backend

- FastAPI
- SQLAlchemy ORM
- Pydantic Settings
- PostgreSQL
- Psycopg
- Microsoft Project XML import endpoint
- Python virtual environment in `backend/.venv`
- Ruff configuration in `backend/pyproject.toml`
- pytest for backend automated tests

## Architecture Overview

The frontend and backend communicate over a REST API.

### Frontend

The frontend lives in `frontend/src/` and is organized by feature area:

- `features/home/`
- `features/dashboard/`
- `features/projects/`
- `features/tasks/`
- `features/settings/`
- `features/navigation/`
- `shared/`
- `app/`

The main frontend patterns are:

- feature-based component organization
- shared API client in `frontend/src/shared/api/http.ts`
- shared type definitions in `frontend/src/shared/types/models.ts`
- theme settings managed with React context in `frontend/src/features/settings/theme/ThemeProvider.tsx`
- routing managed in `frontend/src/app/router/AppRouter.tsx`

### Backend

The backend lives in `backend/project_tracker_api/`.

Core backend modules:

- `main.py` for FastAPI routes
- `models.py` for SQLAlchemy models
- `schemas.py` for request and response schemas
- `crud.py` for database operations and serialization logic
- `database.py` for engine, session, and dependency wiring
- `config.py` for environment-driven settings
- `seed.py` for rebuilding local development data

## Database Approach

The backend talks to PostgreSQL through SQLAlchemy ORM, not handwritten raw SQL for normal CRUD operations.

Examples:

- SQLAlchemy models define tables such as `projects`, `tasks`, `team_members`, `managers`, and `user_settings`
- route handlers call CRUD functions
- CRUD functions use ORM queries such as `select(...)`, `db.get(...)`, `session.add(...)`, and `db.commit()`

The connection is configured in `backend/project_tracker_api/config.py` and `backend/project_tracker_api/database.py`.

Default local database URL:

```text
postgresql+psycopg://postgres:postgres@localhost:5432/project_tracker
```

Override it with `PROJECT_TRACKER_DATABASE_URL` in `backend/.env`.

## Frontend / Backend Data Flow

Typical request flow:

1. A React page or form calls `apiFetch(...)`
2. The request goes to the FastAPI backend under `/api/...`
3. FastAPI route handlers validate input with Pydantic schemas
4. CRUD functions read or write data through SQLAlchemy
5. The backend returns JSON response models
6. The frontend updates local React state and rerenders

Example areas:

- Home page loads all projects
- My Dashboard filters projects and tasks based on the current user
- Project Detail handles project view/edit state and task edit state
- Theme settings are loaded and persisted through the settings API
- Project import accepts Microsoft Project XML and creates a project plus related task and people records

## Microsoft Project Import

New projects can be created from the app at `/projects/new`.

Import behavior:

- upload a Microsoft Project XML export file from the create-project page
- the backend parses project, task, resource, and assignment data
- the app creates one new project record and one task record per imported task, including summary phase rows
- new manager names are added to the `managers` table
- new assigned resource names are added to the `team_members` table
- the uploaded file name is stored in `SourceFileName`

Currently displayed from advanced XML task structure:

- WBS values
- outline-based hierarchy indentation
- summary phases shown as task rows
- milestone badges and milestone timeline checkpoints
- dependency breakdown and dependency labels
- Gantt-style timeline view
- imported calendar metadata

Important note:

- the importer currently supports Microsoft Project XML exports (`.xml`)
- binary native `.mpp` parsing is not implemented in this repo

Sample files for testing are included in:

```text
samples/ms-project/
```

Current sample mix:

- `simple-website-refresh.xml` for a minimal import path
- `client-portal-rollout.xml` for a smaller rollout plan with milestones and assigned resources
- `erp-modernization.xml` for a simpler portfolio-style import verification sample
- `advanced-product-launch.xml` for WBS, summary phases, milestones, dependencies, resources, and notes
- `advanced-infrastructure-program.xml` for a larger roadmap-style structure with the same advanced features

XML note:

- these XML files are example Microsoft Project XML documents, not extracted binary `.mpp` payloads
- Microsoft Project can export and re-open this XML interchange format, which makes it a practical upload target for the app

## FastAPI Docs

FastAPI generates OpenAPI documentation automatically from route definitions plus the Pydantic request and response models.

Built-in docs URLs:

- Swagger UI: `http://127.0.0.1:8000/docs`
- Raw OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

This repo now also adds route summaries and tags so the generated docs are grouped more clearly.

## Repository Structure

```text
react-project-tracker-sql/
  frontend/
    src/
      app/
      features/
      shared/
    public/
    eslint.config.js
    package.json
    tsconfig.json
    vite.config.ts
  backend/
    project_tracker_api/
      main.py
      models.py
      schemas.py
      crud.py
      database.py
      config.py
      seed.py
    .env.example
    pyproject.toml
  package.json
  README.md
```

## Local Setup

### 1. Install Frontend Dependencies

```powershell
npm run frontend:install
```

### 2. Set Up The Backend Environment

Create a virtual environment if needed:

```powershell
npm run backend:venv
```

Activate it in PowerShell:

```powershell
.\backend\.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```powershell
npm run backend:install
```

This installs the backend package plus dev tools such as Ruff into `backend/.venv`.

What that install command is doing:

- it uses the Python executable inside `backend/.venv`
- it installs the Python project defined by `backend/pyproject.toml`
- it installs in editable mode, so backend code changes are picked up without reinstalling
- it includes the `dev` dependency group, which currently installs Ruff

In other words:

- `backend/.venv` is the Python environment
- `backend/pyproject.toml` defines what gets installed into that environment
- `backend/project_tracker_api/` is the source code being installed

### 3. Configure Environment Variables

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

Then set at least:

- `PROJECT_TRACKER_DATABASE_URL`
- `PROJECT_TRACKER_DEFAULT_USER_NAME`
- optional CORS overrides if needed
- optional `PROJECT_TRACKER_ADMIN_USER_NAME` if you want a different default admin account

Frontend fallback note:

- `frontend/.env.example` includes `VITE_DEFAULT_USER_NAME` for the frontend fallback display/user context before settings load
- the frontend cannot read `backend/.env` directly, so backend and frontend each need their own environment variable for this value

### 4. Seed Local Development Data

```powershell
npm run backend:seed
```

This rebuilds the local schema and inserts sample projects, tasks, team members, managers, and user settings.

### 5. Run The Backend

```powershell
npm run backend:dev
```

### 6. Run The Frontend

```powershell
npm run frontend:dev
```

## Common Commands

From the repo root:

```powershell
npm run check

npm run frontend:install
npm run frontend:dev
npm run frontend:build
npm run frontend:lint
npm run frontend:format:check
npm run frontend:test
npm run frontend:test:e2e

npm run backend:venv
npm run backend:install
npm run backend:seed
npm run backend:dev
npm run backend:start
npm run backend:lint
npm run backend:format:check
npm run backend:format
npm run backend:test
npm run backend:audit
npm run backend:security
```

From `frontend/`:

```powershell
npm run dev
npm run build
npm run lint
npm run format
npm run format:check
npm run test
npm run test:e2e
```

### What These Commands Do

- `npm run frontend:install` installs frontend dependencies into `frontend/node_modules`
- `npm run frontend:dev` starts the Vite development server for the React app
- `npm run frontend:build` creates a production frontend build and catches build-time issues
- `npm run frontend:lint` runs ESLint on the frontend code
- `npm run frontend:format:check` checks whether frontend files match Prettier formatting rules without rewriting files
- `npm run frontend:test` runs frontend unit tests with Vitest
- `npm run frontend:test:e2e` runs frontend end-to-end smoke tests with Playwright
- `npm run backend:venv` creates the Python virtual environment in `backend/.venv`
- `npm run backend:install` installs the backend package and dev tools into `backend/.venv`
- `npm run backend:seed` rebuilds the local schema and inserts sample data
- `npm run backend:dev` starts the FastAPI backend with reload enabled
- `npm run backend:start` starts the FastAPI backend without reload, which is useful for stable scripted runs
- `npm run backend:lint` runs Ruff lint checks on the backend Python code
- `npm run backend:format:check` checks whether backend Python files match Ruff formatting rules without rewriting files
- `npm run backend:format` rewrites backend Python files to match Ruff formatting rules
- `npm run backend:test` runs backend automated tests with pytest
- `npm run backend:audit` runs `pip-audit` against backend Python dependencies
- `npm run backend:security` runs Bandit against the backend Python source
- `npm run check` runs the main pre-commit validation flow for the repo

Formatting note:

- use `npm run backend:format:check` when you want to verify formatting
- use `npm run backend:format` when you want Ruff to fix formatting for you
- `npm run check` includes both frontend and backend formatting checks, so it will fail if files need formatting

## Validation Workflow

After larger changes, run these checks from the repo root:

```powershell
npm run check
```

That command runs:

- frontend ESLint
- frontend Prettier check
- frontend Vitest unit tests
- frontend production build with Vite
- backend Ruff lint checks
- backend Ruff format checks
- backend pytest

If you want to run them individually:

```powershell
npm run frontend:lint
npm run frontend:format:check
npm run frontend:test
npm run frontend:build
npm run backend:lint
npm run backend:format:check
npm run backend:test
```

For backend formatting fixes:

```powershell
npm run backend:format
```

For Playwright setup and smoke tests:

```powershell
cd frontend
npx playwright install
npm run test:e2e
```

Current testing status:

- frontend unit tests run with Vitest
- frontend end-to-end smoke coverage is available with Playwright
- backend automated tests run with pytest
- `vite build` is a build verification step, not a test suite
- Ruff is a linter and formatter, not a test runner

Additional hardening commands:

- `npm run backend:audit` for Python dependency vulnerability scanning
- `npm run backend:security` for Python security-focused static analysis

## Testing Conventions

Recommended test placement for this repo:

- frontend Vitest unit and component tests should live next to the feature they cover
- shared frontend test helpers, fixtures, and setup files should live in `frontend/src/test/`
- Playwright end-to-end tests should live in `frontend/e2e/`
- backend pytest tests should live in `backend/tests/`

Suggested structure as the suite grows:

```text
frontend/
  src/
    features/
      home/
        components/
          ProjectSummaryTable.tsx
          ProjectSummaryTable.test.tsx
    test/
      setup.ts
      renderWithProviders.tsx
      fixtures.ts
  e2e/
    home.spec.ts
    project-import.spec.ts
    settings.spec.ts

backend/
  tests/
    conftest.py
    api/
      test_projects.py
      test_tasks.py
      test_settings.py
    import/
      test_ms_project_import.py
    crud/
      test_project_crud.py
```

This keeps frontend component tests close to the code they validate, shared test utilities in one place, end-to-end coverage separated by user flow, and backend tests grouped by API or data layer responsibility.

## Migration Plan

The backend currently includes a lightweight startup-time schema patch for a few legacy columns in local development.

Recommended next step:

- adopt Alembic for database migrations instead of expanding startup patching

Suggested future migration flow:

- create an initial Alembic baseline from the current schema
- add one migration file per schema change
- run migrations during local setup and deployment
- remove legacy startup patch logic once the migration path is stable

This is intentionally planned separately from the current hardening and test work so the repo can keep shipping while migration tooling is introduced carefully.

## App URLs

- Frontend: `http://127.0.0.1:5173`
- Home page: `http://127.0.0.1:5173/`
- My Work: `http://127.0.0.1:5173/my-dashboard`
- Admin page: `http://127.0.0.1:5173/admin`
- Backend health: `http://127.0.0.1:8000/health`
- API base default: `http://127.0.0.1:8000/api`
- FastAPI Swagger UI: `http://127.0.0.1:8000/docs`
- FastAPI OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`
- Create/import page: `http://127.0.0.1:5173/projects/new`
- Settings page: `http://127.0.0.1:5173/settings`

## Log Viewer

The Admin page includes:

- a tabbed Admin view for Imports, Access, Environment, and Logs
- a recent import history panel with date-range filtering
- user visibility and role controls
- an environment and configuration summary
- a current-log viewer for accounts with log visibility enabled
- quick links to Swagger docs, OpenAPI JSON, and the backend health check
- correlation-based import troubleshooting for failed XML uploads

Admin visibility note:

- the `Admin` link is shown only for accounts whose access record allows admin visibility
- new access records default to admin visibility only for `PROJECT_TRACKER_ADMIN_USER_NAME`
- log visibility is controlled separately from general admin visibility
- the backend reads the current file configured by `PROJECT_TRACKER_LOG_FILE_PATH`
- warning and error lines are highlighted in the UI for faster scanning

### Import Troubleshooting

The Admin `Imports` tab is the main place to review project import outcomes.

For failed imports, the app now stores:

- a plain-language failure reason
- technical details for admins
- a `correlationId` for that specific import attempt

The `View related log context` action uses that correlation ID to open the `Logs` tab and filter the backend log to the matching import attempt when possible. This is much more reliable than troubleshooting by timestamp alone.

Typical admin workflow for a failed import:

1. Open `Admin`
2. Go to the `Imports` tab
3. Find the failed upload row
4. Review `Reason` and `Technical details`
5. Click `View related log context`
6. If needed, use `Copy correlation ID` to paste the ID into a bug report, support message, or raw log search

Correlation ID note:

- a correlation ID identifies one specific import attempt
- it is useful for support/debugging even if multiple users import the same file name
- newer import attempts include this value automatically

Log-view note:

- if a failed import has a correlation ID, the log viewer prefers correlation-based filtering
- if older import history rows do not have a correlation ID, the viewer falls back to timestamp-based context
- `npm run backend:start` can be helpful for cleaner troubleshooting because it avoids `uvicorn --reload` watcher/process confusion during debugging

## Styling Notes

The frontend uses:

- React-Bootstrap components
- Bootstrap utility classes for layout and spacing
- custom app-level CSS in `frontend/src/app/styles/app.css`

Theme handling is driven through `ThemeProvider`, which applies `data-bs-theme` at the document level so Bootstrap and custom CSS can respond together.

## Developer Notes

- Use spaces only and 4-space indentation
- Frontend formatting is managed with Prettier
- Frontend linting is managed with ESLint flat config
- Frontend components should use PascalCase
- Frontend non-component functions should use camelCase
- Backend commands should be run through the repo virtual environment in `backend/.venv`
- Backend style is configured for Ruff in `backend/pyproject.toml`
- Backend Python functions should use snake_case following PEP 8
- Keep the root `README.md` as the main entry point for project setup and architecture

If the documentation grows substantially, the next step is to split deeper topics into a `docs/` folder while keeping this file as the main overview.
