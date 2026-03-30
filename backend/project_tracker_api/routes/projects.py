import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..ms_project_import import parse_project_xml

router = APIRouter(tags=["projects"])
logger = logging.getLogger(__name__)


@router.get("/api/projects", response_model=list[schemas.ProjectRead], summary="List projects")
def list_projects(db: Session = Depends(get_db)):
    return crud.get_projects(db)


@router.post(
    "/api/projects",
    response_model=schemas.ProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project",
)
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
    if crud.get_project(db, payload.ProjectUID):
        logger.warning("Rejected duplicate project create.", extra={"projectUID": payload.ProjectUID})
        raise HTTPException(status_code=409, detail="ProjectUID already exists.")
    return crud.create_project(db, payload)


@router.post(
    "/api/projects/import",
    response_model=schemas.ProjectRead,
    status_code=status.HTTP_201_CREATED,
    summary="Import a project from Microsoft Project XML",
)
async def import_project(user_name: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    correlation_id = uuid4().hex
    file_name = file.filename or "imported-project.xml"
    if not file_name.lower().endswith(".xml"):
        failure_reason = "Upload was not an XML file."
        logger.warning(
            "Project import rejected because the uploaded file was not XML.",
            extra={"correlationId": correlation_id, "userName": user_name, "sourceFileName": file_name},
        )
        crud.record_import_event(
            db,
            correlation_id=correlation_id,
            source_file_name=file_name,
            imported_by=user_name,
            status="Failed",
            project_uid=None,
            project_name="",
            task_count=0,
            message="Upload a Microsoft Project XML export (.xml).",
            failure_reason=failure_reason,
            technical_details="Expected a file with the .xml extension.",
        )
        raise HTTPException(status_code=400, detail="Upload a Microsoft Project XML export (.xml).")

    file_bytes = await file.read()
    if not file_bytes:
        failure_reason = "The uploaded XML file was empty."
        logger.warning(
            "Project import rejected because the uploaded XML file was empty.",
            extra={"correlationId": correlation_id, "userName": user_name, "sourceFileName": file_name},
        )
        crud.record_import_event(
            db,
            correlation_id=correlation_id,
            source_file_name=file_name,
            imported_by=user_name,
            status="Failed",
            project_uid=None,
            project_name="",
            task_count=0,
            message="The uploaded file is empty.",
            failure_reason=failure_reason,
            technical_details="No bytes were received from the uploaded file.",
        )
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        imported_project = parse_project_xml(file_bytes, file_name, imported_by=user_name)
    except ValueError as exc:
        failure_reason = "The XML file could not be parsed as a Microsoft Project export."
        logger.warning(
            "Project import validation failed.",
            extra={
                "correlationId": correlation_id,
                "userName": user_name,
                "sourceFileName": file_name,
                "error": str(exc),
            },
        )
        crud.record_import_event(
            db,
            correlation_id=correlation_id,
            source_file_name=file_name,
            imported_by=user_name,
            status="Failed",
            project_uid=None,
            project_name="",
            task_count=0,
            message=str(exc),
            failure_reason=failure_reason,
            technical_details=str(exc),
        )
        raise HTTPException(status_code=400, detail=str(exc))

    return crud.import_project(db, imported_project, correlation_id=correlation_id)


@router.put("/api/projects/{project_id}", response_model=schemas.ProjectRead, summary="Update a project")
def update_project(project_id: int, payload: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id)
    if not project:
        logger.warning("Project not found during update.", extra={"projectUID": project_id})
        raise HTTPException(status_code=404, detail="Project not found.")
    return crud.update_project(db, project, payload)


@router.delete("/api/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a project")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = crud.get_project(db, project_id)
    if not project:
        logger.warning("Project not found during delete.", extra={"projectUID": project_id})
        raise HTTPException(status_code=404, detail="Project not found.")
    crud.delete_project(db, project)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
