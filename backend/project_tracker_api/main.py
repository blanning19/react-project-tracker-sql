from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, schemas
from .config import get_settings
from .database import Base, engine, get_db

settings = get_settings()

app = FastAPI(title="Project Tracker API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/projects", response_model=list[schemas.ProjectRead])
def list_projects(db: Session = Depends(get_db)):
    return crud.get_projects(db)


@app.post("/api/projects", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
    if crud.get_project(db, payload.ProjectUID):
        raise HTTPException(status_code=409, detail="ProjectUID already exists.")
    return crud.create_project(db, payload)


@app.put("/api/projects/{project_id}", response_model=schemas.ProjectRead)
def update_project(project_id: int, payload: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return crud.update_project(db, project, payload)


@app.delete("/api/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    crud.delete_project(db, project)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/api/tasks", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: schemas.TaskCreate, db: Session = Depends(get_db)):
    if crud.get_task(db, payload.TaskUID):
        raise HTTPException(status_code=409, detail="TaskUID already exists.")
    if not crud.get_project(db, payload.ProjectUID):
        raise HTTPException(status_code=404, detail="Project for task not found.")
    return crud.create_task(db, payload)


@app.put("/api/tasks/{task_id}", response_model=schemas.TaskRead)
def update_task(task_id: int, payload: schemas.TaskUpdate, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    if not crud.get_project(db, payload.ProjectUID):
        raise HTTPException(status_code=404, detail="Project for task not found.")
    return crud.update_task(db, task, payload)


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    crud.delete_task(db, task)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/settings/{user_id}", response_model=schemas.UserSettingsRead)
def get_settings_for_user(user_id: str, db: Session = Depends(get_db)):
    setting = crud.get_or_create_settings(db, user_id)
    return crud.serialize_settings(setting)


@app.put("/api/settings/{user_id}", response_model=schemas.UserSettingsRead)
def update_settings_for_user(user_id: str, payload: schemas.UserSettingsUpdate, db: Session = Depends(get_db)):
    if payload.userId != user_id:
        raise HTTPException(status_code=400, detail="User id mismatch.")
    setting = crud.get_or_create_settings(db, user_id)
    return crud.update_settings(db, setting, payload)


@app.get("/api/team-members", response_model=list[schemas.TeamMemberRead])
def list_team_members(db: Session = Depends(get_db)):
    return crud.get_team_members(db)


@app.get("/api/managers", response_model=list[schemas.ManagerRead])
def list_managers(db: Session = Depends(get_db)):
    return crud.get_managers(db)
