from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from . import models, schemas
from .config import get_settings
from .persistence import commit_with_rollback
from .versioning import get_backend_version


def serialize_import_event(import_event: models.ImportEvent) -> schemas.ImportEventRead:
    return schemas.ImportEventRead(
        importEventId=import_event.import_event_id,
        createdAt=import_event.created_at,
        correlationId=import_event.correlation_id,
        sourceFileName=import_event.source_file_name,
        importedBy=import_event.imported_by,
        status=import_event.status,
        projectUid=import_event.project_uid,
        projectName=import_event.project_name,
        taskCount=import_event.task_count,
        message=import_event.message,
        failureReason=import_event.failure_reason,
        technicalDetails=import_event.technical_details,
    )


def record_import_event(
    db: Session,
    *,
    correlation_id: str,
    source_file_name: str,
    imported_by: str,
    status: str,
    project_uid: int | None,
    project_name: str,
    task_count: int,
    message: str,
    failure_reason: str = "",
    technical_details: str = "",
) -> None:
    import_event = models.ImportEvent(
        correlation_id=correlation_id,
        source_file_name=source_file_name,
        imported_by=imported_by or "Unknown",
        status=status,
        project_uid=project_uid,
        project_name=project_name,
        task_count=task_count,
        message=message,
        failure_reason=failure_reason,
        technical_details=technical_details,
    )
    db.add(import_event)
    commit_with_rollback(
        db,
        "Failed to record import event.",
        correlation_id=correlation_id,
        source_file_name=source_file_name,
        imported_by=imported_by,
        status=status,
    )


def get_recent_import_events(db: Session, limit: int = 10) -> list[schemas.ImportEventRead]:
    import_events = db.scalars(
        select(models.ImportEvent)
        .order_by(models.ImportEvent.created_at.desc(), models.ImportEvent.import_event_id.desc())
        .limit(limit)
    ).all()
    return [serialize_import_event(import_event) for import_event in import_events]


def get_import_event_summary(db: Session) -> schemas.ImportEventSummaryRead:
    import_events = db.scalars(select(models.ImportEvent).order_by(models.ImportEvent.created_at.desc())).all()
    successful_imports = sum(1 for import_event in import_events if import_event.status == "Succeeded")
    failed_imports = sum(1 for import_event in import_events if import_event.status == "Failed")
    last_failure = next((import_event for import_event in import_events if import_event.status == "Failed"), None)
    return schemas.ImportEventSummaryRead(
        totalImports=len(import_events),
        successfulImports=successful_imports,
        failedImports=failed_imports,
        lastFailureMessage=last_failure.message if last_failure else None,
    )


def serialize_user_access(user_access: models.UserAccess) -> schemas.UserAccessRead:
    return schemas.UserAccessRead(
        userName=user_access.user_name,
        role=user_access.role,
        canViewAdmin=user_access.can_view_admin,
        canViewLogs=user_access.can_view_logs,
        notes=user_access.notes,
    )


def get_or_create_user_access(db: Session, user_name: str) -> models.UserAccess:
    user_access = db.get(models.UserAccess, user_name)
    if user_access:
        return user_access

    settings = get_settings()
    normalized_name = user_name.strip()
    is_admin_user = normalized_name == settings.admin_user_name
    user_access = models.UserAccess(
        user_name=normalized_name,
        role="Admin" if is_admin_user else "Viewer",
        can_view_admin=is_admin_user,
        can_view_logs=is_admin_user,
    )
    db.add(user_access)
    commit_with_rollback(db, "Failed to create user access.", user_name=user_name)
    db.refresh(user_access)
    return user_access


def get_user_access_list(db: Session) -> list[schemas.UserAccessRead]:
    access_records = db.scalars(select(models.UserAccess).order_by(models.UserAccess.user_name)).all()
    return [serialize_user_access(access_record) for access_record in access_records]


def get_user_access(db: Session, user_name: str) -> schemas.UserAccessRead:
    return serialize_user_access(get_or_create_user_access(db, user_name))


def update_user_access(db: Session, user_name: str, payload: schemas.UserAccessUpdate) -> schemas.UserAccessRead:
    access_record = get_or_create_user_access(db, user_name)
    access_record.role = payload.role
    access_record.can_view_admin = payload.canViewAdmin
    access_record.can_view_logs = payload.canViewLogs
    access_record.notes = payload.notes
    commit_with_rollback(db, "Failed to update user access.", user_name=user_name)
    db.refresh(access_record)
    return serialize_user_access(access_record)


def get_environment_summary() -> schemas.EnvironmentSummaryRead:
    settings = get_settings()
    database_url = make_url(settings.database_url)
    return schemas.EnvironmentSummaryRead(
        appVersion=get_backend_version(),
        adminUserName=settings.admin_user_name,
        logFilePath=settings.log_file_path,
        corsOrigins=settings.cors_origins,
        databaseBackend=database_url.get_backend_name(),
        databaseHost=database_url.host,
        databaseName=database_url.database,
        swaggerDocsUrl="http://127.0.0.1:8000/docs",
        openapiJsonUrl="http://127.0.0.1:8000/openapi.json",
        healthUrl="http://127.0.0.1:8000/health",
    )
