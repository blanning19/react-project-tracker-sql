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

### Backend

- FastAPI
- SQLAlchemy ORM
- Pydantic Settings
- PostgreSQL
- Psycopg
- Microsoft Project XML import endpoint
- Python virtual environment in `backend/.venv`
- Ruff configuration in `backend/pyproject.toml`

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

Important note:

- the importer currently supports Microsoft Project XML exports (`.xml`)
- binary native `.mpp` parsing is not implemented in this repo

Sample files for testing are included in:

```text
samples/ms-project/
```

Current sample mix:

- `simple-website-refresh.xml` for a minimal import path
- `advanced-product-launch.xml` for WBS, summary phases, milestones, dependencies, resources, and notes
- `advanced-infrastructure-program.xml` for a larger roadmap-style structure with the same advanced features

XML note:

- these XML files are example Microsoft Project XML documents, not extracted binary `.mpp` payloads
- Microsoft Project can export and re-open this XML interchange format, which makes it a practical upload target for the app

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
- optional CORS overrides if needed
- optional `PROJECT_TRACKER_ADMIN_USER_NAME` if you want a different account to see the log viewer in Settings

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

npm run backend:venv
npm run backend:install
npm run backend:seed
npm run backend:dev
npm run backend:lint
npm run backend:format:check
npm run backend:format
```

From `frontend/`:

```powershell
npm run dev
npm run build
npm run lint
npm run format
```

### What These Commands Do

- `npm run frontend:install` installs frontend dependencies into `frontend/node_modules`
- `npm run frontend:dev` starts the Vite development server for the React app
- `npm run frontend:build` creates a production frontend build and catches build-time issues
- `npm run frontend:lint` runs ESLint on the frontend code
- `npm run backend:venv` creates the Python virtual environment in `backend/.venv`
- `npm run backend:install` installs the backend package and dev tools into `backend/.venv`
- `npm run backend:seed` rebuilds the local schema and inserts sample data
- `npm run backend:dev` starts the FastAPI backend with reload enabled
- `npm run backend:lint` runs Ruff lint checks on the backend Python code
- `npm run backend:format:check` checks whether backend Python files match Ruff formatting rules without rewriting files
- `npm run backend:format` rewrites backend Python files to match Ruff formatting rules
- `npm run check` runs the main pre-commit validation flow for the repo

Formatting note:

- use `npm run backend:format:check` when you want to verify formatting
- use `npm run backend:format` when you want Ruff to fix formatting for you
- `npm run check` includes `backend:format:check`, so it will fail if backend files need formatting

## Validation Workflow

After larger changes, run these checks from the repo root:

```powershell
npm run check
```

That command runs:

- frontend ESLint
- frontend production build with Vite
- backend Ruff lint checks
- backend Ruff format checks

If you want to run them individually:

```powershell
npm run frontend:lint
npm run frontend:build
npm run backend:lint
npm run backend:format:check
```

For backend formatting fixes:

```powershell
npm run backend:format
```

Current testing status:

- frontend automated tests are not set up yet
- backend automated tests are not set up yet
- `vite build` is a build verification step, not a test suite
- Ruff is a linter and formatter, not a test runner

The next recommended additions are:

- `pytest` for FastAPI route, schema, and CRUD tests
- `vitest` for frontend utility and component tests

## App URLs

- Frontend: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:8000/health`
- API base default: `http://127.0.0.1:8000/api`
- Create/import page: `http://127.0.0.1:5173/projects/new`

## Log Viewer

The Settings page includes a current-log viewer for the admin account only.

- the backend reads the current file configured by `PROJECT_TRACKER_LOG_FILE_PATH`
- access is allowed only when the current user name matches `PROJECT_TRACKER_ADMIN_USER_NAME`
- warning and error lines are highlighted in the UI for faster scanning

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
- Backend commands should be run through the repo virtual environment in `backend/.venv`
- Backend style is configured for Ruff in `backend/pyproject.toml`
- Keep the root `README.md` as the main entry point for project setup and architecture

If the documentation grows substantially, the next step is to split deeper topics into a `docs/` folder while keeping this file as the main overview.
