import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import crud

logger = logging.getLogger(__name__)


def ensure_admin_access(db: Session, user_name: str, *, require_log_access: bool = False) -> None:
    access_record = crud.get_or_create_user_access(db, user_name.strip())
    has_access = access_record.can_view_logs if require_log_access else access_record.can_view_admin
    if not has_access:
        logger.warning("Rejected admin access for non-admin user.", extra={"userName": user_name})
        raise HTTPException(status_code=403, detail="You are not allowed to access admin tools.")
