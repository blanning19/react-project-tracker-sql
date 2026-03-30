from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..api_dependencies import ensure_admin_access
from ..database import get_db

router = APIRouter()


@router.get(
    "/api/admin/environment",
    response_model=schemas.EnvironmentSummaryRead,
    tags=["system"],
    summary="Get environment and configuration summary",
)
def get_environment_summary(user_name: str, db: Session = Depends(get_db)):
    ensure_admin_access(db, user_name)
    return crud.get_environment_summary()


@router.get(
    "/api/admin/import-events",
    response_model=list[schemas.ImportEventRead],
    tags=["projects"],
    summary="List recent import events",
)
def list_import_events(user_name: str, db: Session = Depends(get_db)):
    ensure_admin_access(db, user_name)
    return crud.get_recent_import_events(db)


@router.get(
    "/api/admin/import-events/summary",
    response_model=schemas.ImportEventSummaryRead,
    tags=["projects"],
    summary="Get import event summary",
)
def get_import_event_summary(user_name: str, db: Session = Depends(get_db)):
    ensure_admin_access(db, user_name)
    return crud.get_import_event_summary(db)


@router.get(
    "/api/admin/access/me",
    response_model=schemas.UserAccessRead,
    tags=["settings"],
    summary="Get current user admin access",
)
def get_current_user_access(user_name: str, db: Session = Depends(get_db)):
    return crud.get_user_access(db, user_name)


@router.get(
    "/api/admin/access",
    response_model=list[schemas.UserAccessRead],
    tags=["settings"],
    summary="List user access controls",
)
def list_user_access(user_name: str, db: Session = Depends(get_db)):
    ensure_admin_access(db, user_name)
    return crud.get_user_access_list(db)


@router.put(
    "/api/admin/access/{target_user_name}",
    response_model=schemas.UserAccessRead,
    tags=["settings"],
    summary="Update user access controls",
)
def update_user_access(
    target_user_name: str,
    user_name: str,
    payload: schemas.UserAccessUpdate,
    db: Session = Depends(get_db),
):
    ensure_admin_access(db, user_name)
    return crud.update_user_access(db, target_user_name, payload)
