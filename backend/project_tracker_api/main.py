import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from . import database
from .config import get_settings
from .logging_config import configure_logging
from .routes import admin, directory, projects, system, tasks
from .routes import settings as settings_routes

settings = get_settings()
configure_logging(settings.log_level, settings.log_file_path)
logger = logging.getLogger(__name__)
# Tests and existing imports still expect get_db to be available from main.py,
# so we re-export it here even though route modules now import it directly.
get_db = database.get_db


def create_app(*, include_startup_db_init: bool = True) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if include_startup_db_init:
            database.Base.metadata.create_all(bind=database.engine)
            database.ensure_legacy_schema_columns()
            logger.info("Project Tracker API started.")
        yield

    app = FastAPI(
        title="Project Tracker API",
        version="0.1.0",
        description=(
            "REST API for the Project Tracker workspace. FastAPI automatically publishes interactive "
            "OpenAPI documentation at /docs plus a machine-readable schema at /openapi.json."
        ),
        lifespan=lifespan,
        redoc_url=None,
        openapi_tags=[
            {"name": "system", "description": "Health and diagnostics endpoints."},
            {"name": "projects", "description": "Project CRUD and Microsoft Project XML import."},
            {"name": "tasks", "description": "Task CRUD operations for project work items."},
            {"name": "settings", "description": "Per-user settings and application logs."},
            {"name": "directory", "description": "Team member and manager directory lookups."},
        ],
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(SQLAlchemyError)
    def handle_database_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        del exc
        logger.exception("Unhandled database error.", extra={"path": str(request.url.path)})
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "A database error occurred."},
        )

    # Routes are organized by domain so API behavior can evolve without turning
    # the app factory into a single giant handler file.
    app.include_router(system.router)
    app.include_router(projects.router)
    app.include_router(tasks.router)
    app.include_router(settings_routes.router)
    app.include_router(directory.router)
    app.include_router(admin.router)

    return app


app = create_app()
