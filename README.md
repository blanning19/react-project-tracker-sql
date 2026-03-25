# Project Tracker Workspace

Monorepo-style layout with a React/Vite/TypeScript frontend in `frontend/` and a FastAPI/Postgres backend in `backend/`.

## Repository layout

```text
project-tracker-1/
  frontend/
    src/
    public/
    package.json
  backend/
    project_tracker_api/
    .env.example
    pyproject.toml
```

## Frontend

Install frontend dependencies:

```bash
npm run frontend:install
```

Start the frontend:

```bash
npm run frontend:dev
```

Build the frontend:

```bash
npm run frontend:build
```

## Backend

Create a virtual environment if you want an isolated Python setup:

```bash
npm run backend:venv
```

Activate it on Windows PowerShell:

```powershell
.\backend\.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```bash
npm run backend:install
```

Copy `backend/.env.example` to `backend/.env` and update the Postgres connection string.

Seed the database:

```bash
npm run backend:seed
```

Start the API:

```bash
npm run backend:dev
```

## App URLs

- Frontend: `http://127.0.0.1:5173`
- Backend health: `http://127.0.0.1:8000/health`
