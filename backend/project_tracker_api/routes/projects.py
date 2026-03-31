import logging
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..ms_project_import import parse_project_xml

router = APIRouter(tags=["projects"])
logger = logging.getLogger(__name__)


def reject_project_import(
    db: Session,
    *,
    correlation_id: str,
    user_name: str,
    source_file_name: str,
    log_message: str,
    client_detail: str,
    failure_reason: str,
    technical_details: str,
    log_extra: dict[str, str] | None = None,
) -> None:
    # Keep import rejection behavior in one place so the HTTP response, log
    # entry, and audit trail stay synchronized as validation rules evolve.
    logger.warning(
        log_message,
        extra={
            "correlationId": correlation_id,
            "userName": user_name,
            "sourceFileName": source_file_name,
            **(log_extra or {}),
        },
    )
    crud.record_import_event(
        db,
        correlation_id=correlation_id,
        source_file_name=source_file_name,
        imported_by=user_name,
        status="Failed",
        project_uid=None,
        project_name="",
        task_count=0,
        message=client_detail,
        failure_reason=failure_reason,
        technical_details=technical_details,
    )
    raise HTTPException(status_code=400, detail=client_detail)


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
        reject_project_import(
            db,
            correlation_id=correlation_id,
            user_name=user_name,
            source_file_name=file_name,
            log_message="Project import rejected because the uploaded file was not XML.",
            client_detail="Upload a Microsoft Project XML export (.xml).",
            failure_reason="Upload was not an XML file.",
            technical_details="Expected a file with the .xml extension.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        reject_project_import(
            db,
            correlation_id=correlation_id,
            user_name=user_name,
            source_file_name=file_name,
            log_message="Project import rejected because the uploaded XML file was empty.",
            client_detail="The uploaded file is empty.",
            failure_reason="The uploaded XML file was empty.",
            technical_details="No bytes were received from the uploaded file.",
        )

    try:
        imported_project = parse_project_xml(file_bytes, file_name, imported_by=user_name)
    except ValueError as exc:
        reject_project_import(
            db,
            correlation_id=correlation_id,
            user_name=user_name,
            source_file_name=file_name,
            log_message="Project import validation failed.",
            client_detail=str(exc),
            failure_reason="The XML file could not be parsed as a Microsoft Project export.",
            technical_details=str(exc),
            log_extra={"error": str(exc)},
        )

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
