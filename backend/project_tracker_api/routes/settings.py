import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..api_dependencies import ensure_admin_access
from ..config import get_settings
from ..database import get_db

router = APIRouter(tags=["settings"])
logger = logging.getLogger(__name__)
settings = get_settings()


@router.get("/api/settings/{user_id}", response_model=schemas.UserSettingsRead, summary="Get user settings")
def get_settings_for_user(user_id: str, db: Session = Depends(get_db)):
    setting = crud.get_or_create_settings(db, user_id)
    return crud.serialize_settings(setting)


@router.put("/api/settings/{user_id}", response_model=schemas.UserSettingsRead, summary="Update user settings")
def update_settings_for_user(user_id: str, payload: schemas.UserSettingsUpdate, db: Session = Depends(get_db)):
    if payload.userId != user_id:
        logger.warning(
            "Rejected settings update due to user mismatch.",
            extra={"routeUserId": user_id, "payloadUserId": payload.userId},
        )
        raise HTTPException(status_code=400, detail="User id mismatch.")
    setting = crud.get_or_create_settings(db, user_id)
    return crud.update_settings(db, setting, payload)


@router.get("/api/logs/current", response_model=schemas.LogFileRead, summary="Read the current log file")
def get_current_log(
    user_name: str,
    around_timestamp: str | None = None,
    correlation_id: str | None = None,
    db: Session = Depends(get_db),
):
    ensure_admin_access(db, user_name, require_log_access=True)
    parsed_timestamp = None
    if around_timestamp:
        try:
            parsed_timestamp = datetime.fromisoformat(around_timestamp.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            raise HTTPException(status_code=400, detail="around_timestamp must be a valid ISO timestamp.")
    return crud.read_log_file_with_context(
        settings.log_file_path,
        around_timestamp=parsed_timestamp,
        correlation_id=correlation_id.strip() if correlation_id else None,
    )
