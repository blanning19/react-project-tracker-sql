import logging

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def commit_with_rollback(db: Session, message: str, **context: object) -> None:
    """Commit a unit of work and preserve the original error context on failure."""
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception(message, extra={"context": context})
        raise
