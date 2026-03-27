import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from . import crud, schemas
from .config import get_settings
from .database import Base, engine, ensure_legacy_schema_columns, get_db
from .logging_config import configure_logging
from .ms_project_import import parse_project_xml

settings = get_settings()
configure_logging(settings.log_level, settings.log_file_path)
logger = logging.getLogger(__name__)


def create_app(*, include_startup_db_init: bool = True) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if include_startup_db_init:
            Base.metadata.create_all(bind=engine)
            ensure_legacy_schema_columns()
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

    @app.get("/health", tags=["system"], summary="Health check")
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api/projects", response_model=list[schemas.ProjectRead], tags=["projects"], summary="List projects")
    def list_projects(db: Session = Depends(get_db)):
        return crud.get_projects(db)

    @app.post(
        "/api/projects",
        response_model=schemas.ProjectRead,
        status_code=status.HTTP_201_CREATED,
        tags=["projects"],
        summary="Create a project",
    )
    def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
        if crud.get_project(db, payload.ProjectUID):
            logger.warning("Rejected duplicate project create.", extra={"projectUID": payload.ProjectUID})
            raise HTTPException(status_code=409, detail="ProjectUID already exists.")
        return crud.create_project(db, payload)

    @app.post(
        "/api/projects/import",
        response_model=schemas.ProjectRead,
        status_code=status.HTTP_201_CREATED,
        tags=["projects"],
        summary="Import a project from Microsoft Project XML",
    )
    async def import_project(file: UploadFile = File(...), db: Session = Depends(get_db)):
        file_name = file.filename or "imported-project.xml"
        if not file_name.lower().endswith(".xml"):
            raise HTTPException(status_code=400, detail="Upload a Microsoft Project XML export (.xml).")

        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")

        try:
            imported_project = parse_project_xml(file_bytes, file_name)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        return crud.import_project(db, imported_project)

    @app.put(
        "/api/projects/{project_id}", response_model=schemas.ProjectRead, tags=["projects"], summary="Update a project"
    )
    def update_project(project_id: int, payload: schemas.ProjectUpdate, db: Session = Depends(get_db)):
        project = crud.get_project(db, project_id)
        if not project:
            logger.warning("Project not found during update.", extra={"projectUID": project_id})
            raise HTTPException(status_code=404, detail="Project not found.")
        return crud.update_project(db, project, payload)

    @app.delete(
        "/api/projects/{project_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        tags=["projects"],
        summary="Delete a project",
    )
    def delete_project(project_id: int, db: Session = Depends(get_db)):
        project = crud.get_project(db, project_id)
        if not project:
            logger.warning("Project not found during delete.", extra={"projectUID": project_id})
            raise HTTPException(status_code=404, detail="Project not found.")
        crud.delete_project(db, project)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.post(
        "/api/tasks",
        response_model=schemas.TaskRead,
        status_code=status.HTTP_201_CREATED,
        tags=["tasks"],
        summary="Create a task",
    )
    def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db)):
        if crud.get_task(db, payload.TaskUID):
            logger.warning("Rejected duplicate task create.", extra={"taskUID": payload.TaskUID})
            raise HTTPException(status_code=409, detail="TaskUID already exists.")
        if not crud.get_project(db, payload.ProjectUID):
            logger.warning(
                "Task create failed due to missing project.",
                extra={"taskUID": payload.TaskUID, "projectUID": payload.ProjectUID},
            )
            raise HTTPException(status_code=404, detail="Project for task not found.")
        return crud.create_task(db, payload)

    @app.put("/api/tasks/{task_id}", response_model=schemas.TaskRead, tags=["tasks"], summary="Update a task")
    def update_task(task_id: int, payload: schemas.TaskUpdate, db: Session = Depends(get_db)):
        task = crud.get_task(db, task_id)
        if not task:
            logger.warning("Task not found during update.", extra={"taskUID": task_id})
            raise HTTPException(status_code=404, detail="Task not found.")
        if not crud.get_project(db, payload.ProjectUID):
            logger.warning(
                "Task update failed due to missing project.",
                extra={"taskUID": task_id, "projectUID": payload.ProjectUID},
            )
            raise HTTPException(status_code=404, detail="Project for task not found.")
        return crud.update_task(db, task, payload)

    @app.delete(
        "/api/tasks/{task_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        tags=["tasks"],
        summary="Delete a task",
    )
    def delete_task(task_id: int, db: Session = Depends(get_db)):
        task = crud.get_task(db, task_id)
        if not task:
            logger.warning("Task not found during delete.", extra={"taskUID": task_id})
            raise HTTPException(status_code=404, detail="Task not found.")
        crud.delete_task(db, task)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.get(
        "/api/settings/{user_id}",
        response_model=schemas.UserSettingsRead,
        tags=["settings"],
        summary="Get user settings",
    )
    def get_settings_for_user(user_id: str, db: Session = Depends(get_db)):
        setting = crud.get_or_create_settings(db, user_id)
        return crud.serialize_settings(setting)

    @app.put(
        "/api/settings/{user_id}",
        response_model=schemas.UserSettingsRead,
        tags=["settings"],
        summary="Update user settings",
    )
    def update_settings_for_user(user_id: str, payload: schemas.UserSettingsUpdate, db: Session = Depends(get_db)):
        if payload.userId != user_id:
            logger.warning(
                "Rejected settings update due to user mismatch.",
                extra={"routeUserId": user_id, "payloadUserId": payload.userId},
            )
            raise HTTPException(status_code=400, detail="User id mismatch.")
        setting = crud.get_or_create_settings(db, user_id)
        return crud.update_settings(db, setting, payload)

    @app.get(
        "/api/team-members",
        response_model=list[schemas.TeamMemberRead],
        tags=["directory"],
        summary="List team members",
    )
    def list_team_members(db: Session = Depends(get_db)):
        return crud.get_team_members(db)

    @app.get("/api/managers", response_model=list[schemas.ManagerRead], tags=["directory"], summary="List managers")
    def list_managers(db: Session = Depends(get_db)):
        return crud.get_managers(db)

    @app.get(
        "/api/logs/current", response_model=schemas.LogFileRead, tags=["settings"], summary="Read the current log file"
    )
    def get_current_log(user_name: str):
        if user_name.strip().lower() != settings.admin_user_name.strip().lower():
            logger.warning("Rejected log view request for non-admin user.", extra={"userName": user_name})
            raise HTTPException(status_code=403, detail="You are not allowed to view the application log.")
        return crud.read_log_file(settings.log_file_path)

    return app


app = create_app()
