# Project Tracker Workspace

Project Tracker is a full-stack project and task tracking workspace with a React frontend and a FastAPI backend. It is designed around project-level visibility, task assignment, dashboard views, and a PostgreSQL-backed API.

The repository uses a monorepo-style structure:

```text
project-tracker-1/
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

## Repository Structure

```text
project-tracker-1/
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
npm run frontend:install
npm run frontend:dev
npm run frontend:build
npm run frontend:lint

npm run backend:venv
npm run backend:install
npm run backend:seed
npm run backend:dev
```

From `frontend/`:

```powershell
npm run dev
npm run build
npm run lint
npm run format
```

## App URLs

- Frontend: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:8000/health`
- API base default: `http://127.0.0.1:8000/api`

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
- Backend style is configured for Ruff in `backend/pyproject.toml`
- Keep the root `README.md` as the main entry point for project setup and architecture

If the documentation grows substantially, the next step is to split deeper topics into a `docs/` folder while keeping this file as the main overview.
