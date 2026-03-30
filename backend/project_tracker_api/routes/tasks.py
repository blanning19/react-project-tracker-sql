import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(tags=["tasks"])
logger = logging.getLogger(__name__)


@router.post(
    "/api/tasks",
    response_model=schemas.TaskRead,
    status_code=status.HTTP_201_CREATED,
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


@router.put("/api/tasks/{task_id}", response_model=schemas.TaskRead, summary="Update a task")
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


@router.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a task")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = crud.get_task(db, task_id)
    if not task:
        logger.warning("Task not found during delete.", extra={"taskUID": task_id})
        raise HTTPException(status_code=404, detail="Task not found.")
    crud.delete_task(db, task)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
