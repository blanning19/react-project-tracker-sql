import json
import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from . import admin_service, log_service, models, schemas
from .config import get_settings
from .ms_project_import import ImportedProject
from .persistence import commit_with_rollback

logger = logging.getLogger(__name__)


def is_overdue(finish: date, percent_complete: int, status: str) -> bool:
    return finish < date.today() and percent_complete < 100 and status.lower() != "completed"


def calculate_duration_days(start: date, finish: date) -> int:
    return max(1, (finish - start).days)


def calculate_project_percent_complete(tasks: list[models.Task]) -> int:
    if not tasks:
        return 0

    return round(sum(task.PercentComplete for task in tasks) / len(tasks))


def serialize_json_list(value: str) -> list[str]:
    if not value:
        return []
    try:
        parsed_value = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed_value, list):
        return []
    return [str(item).strip() for item in parsed_value if str(item).strip()]


def json_list(value: list[str]) -> str:
    return json.dumps(value)


def task_lists_from_model(task: models.Task) -> tuple[list[str], list[str], list[str]]:
    labels = serialize_json_list(task.LabelsJson)
    checklist_items = serialize_json_list(task.ChecklistItemsJson)
    completed_checklist_items = serialize_json_list(task.CompletedChecklistItemsJson)
    return labels, checklist_items, completed_checklist_items


def build_task_read_payload(task: models.Task) -> dict:
    labels, checklist_items, completed_checklist_items = task_lists_from_model(task)
    return {
        "TaskUID": task.TaskUID,
        "ProjectUID": task.ProjectUID,
        "TaskName": task.TaskName,
        "OutlineLevel": task.OutlineLevel,
        "OutlineNumber": task.OutlineNumber,
        "WBS": task.WBS,
        "IsSummary": task.IsSummary,
        "Predecessors": task.Predecessors,
        "ResourceNames": task.ResourceNames,
        "Start": task.Start,
        "Finish": task.Finish,
        "DurationDays": task.DurationDays,
        "PercentComplete": task.PercentComplete,
        "Status": task.Status,
        "IsMilestone": task.IsMilestone,
        "Notes": task.Notes,
        "BucketName": task.BucketName,
        "Labels": labels,
        "ChecklistItems": checklist_items,
        "CompletedChecklistItems": completed_checklist_items,
        "ChecklistProgress": build_checklist_progress(task),
        "IsOverdue": is_overdue(task.Finish, task.PercentComplete, task.Status),
    }


def apply_task_payload(task: models.Task, payload: schemas.TaskBase) -> None:
    payload_data = payload.model_dump()
    payload_data.pop("TaskUID", None)
    payload_data["LabelsJson"] = json_list(payload.Labels)
    payload_data["ChecklistItemsJson"] = json_list(payload.ChecklistItems)
    payload_data["CompletedChecklistItemsJson"] = json_list(payload.CompletedChecklistItems)
    payload_data.pop("Labels", None)
    payload_data.pop("ChecklistItems", None)
    payload_data.pop("CompletedChecklistItems", None)
    payload_data.pop("ChecklistProgress", None)

    for key, value in payload_data.items():
        setattr(task, key, value)

    task.DurationDays = calculate_duration_days(task.Start, task.Finish)


def serialize_planner_metadata(value: str) -> schemas.PlannerImportMetadataModel | None:
    if not value:
        return None
    try:
        return schemas.PlannerImportMetadataModel.model_validate(json.loads(value))
    except (json.JSONDecodeError, ValueError):
        return None


def build_checklist_progress(task: models.Task) -> schemas.ChecklistProgressModel:
    total_items = len(serialize_json_list(task.ChecklistItemsJson))
    completed_items = len(serialize_json_list(task.CompletedChecklistItemsJson))
    percent_complete = round((completed_items / total_items) * 100) if total_items > 0 else 0
    return schemas.ChecklistProgressModel(
        completedItems=completed_items,
        totalItems=total_items,
        percentComplete=percent_complete,
    )


def get_tasks_for_project(db: Session, project_uid: int) -> list[models.Task]:
    return db.scalars(
        select(models.Task).where(models.Task.ProjectUID == project_uid).order_by(models.Task.TaskUID)
    ).all()


def sync_project_metrics(db: Session, project: models.Project) -> None:
    project.DurationDays = calculate_duration_days(project.Start, project.Finish)
    project.PercentComplete = calculate_project_percent_complete(get_tasks_for_project(db, project.ProjectUID))


def serialize_task(task: models.Task) -> schemas.TaskRead:
    return schemas.TaskRead.model_validate(build_task_read_payload(task))


def serialize_project(project: models.Project) -> schemas.ProjectRead:
    duration_days = calculate_duration_days(project.Start, project.Finish)
    percent_complete = calculate_project_percent_complete(project.tasks)

    return schemas.ProjectRead.model_validate(
        {
            "ProjectUID": project.ProjectUID,
            "ProjectName": project.ProjectName,
            "ProjectManager": project.ProjectManager,
            "CreatedDate": project.CreatedDate,
            "CalendarName": project.CalendarName,
            "Start": project.Start,
            "Finish": project.Finish,
            "DurationDays": duration_days,
            "PercentComplete": percent_complete,
            "Status": project.Status,
            "Priority": project.Priority,
            "Notes": project.Notes,
            "SourceFileName": project.SourceFileName,
            "PlannerImportMetadata": serialize_planner_metadata(project.PlannerImportMetadata),
            "IsOverdue": is_overdue(project.Finish, percent_complete, project.Status),
            "tasks": [serialize_task(task) for task in project.tasks],
        }
    )


def get_projects(db: Session) -> list[schemas.ProjectRead]:
    projects = db.scalars(
        select(models.Project).options(selectinload(models.Project.tasks)).order_by(models.Project.ProjectUID)
    ).all()
    logger.info("Loaded projects.", extra={"projectCount": len(projects)})
    return [serialize_project(project) for project in projects]


def ensure_manager_exists(db: Session, display_name: str) -> None:
    normalized_name = display_name.strip()
    if not normalized_name:
        return

    existing = db.scalar(select(models.Manager).where(models.Manager.display_name == normalized_name))
    if existing:
        return

    savepoint = db.begin_nested()
    try:
        db.add(models.Manager(display_name=normalized_name))
        db.flush()
        savepoint.commit()
    except IntegrityError:
        savepoint.rollback()


def ensure_team_members_exist(db: Session, names: list[str]) -> None:
    for name in names:
        normalized_name = name.strip()
        if not normalized_name:
            continue

        existing = db.scalar(select(models.TeamMember).where(models.TeamMember.display_name == normalized_name))
        if existing:
            continue

        savepoint = db.begin_nested()
        try:
            db.add(models.TeamMember(display_name=normalized_name))
            db.flush()
            savepoint.commit()
        except IntegrityError:
            savepoint.rollback()


def import_project(
    db: Session, imported_project: ImportedProject, *, correlation_id: str | None = None
) -> schemas.ProjectRead:
    ensure_manager_exists(db, imported_project.manager)

    team_member_names = sorted(
        {
            resource_name.strip()
            for task in imported_project.tasks
            for resource_name in task.resource_names.split(",")
            if resource_name.strip()
        }
    )
    if team_member_names:
        ensure_team_members_exist(db, team_member_names)

    project = models.Project(
        ProjectName=imported_project.name,
        ProjectManager=imported_project.manager,
        CreatedDate=date.today(),
        CalendarName=imported_project.calendar_name,
        Start=imported_project.start,
        Finish=imported_project.finish,
        DurationDays=imported_project.duration_days,
        PercentComplete=imported_project.percent_complete,
        Status=imported_project.status,
        Priority=imported_project.priority,
        Notes=imported_project.notes,
        SourceFileName=imported_project.source_file_name,
        PlannerImportMetadata="",
    )
    db.add(project)
    db.flush()
    project_uid = project.ProjectUID

    for imported_task in imported_project.tasks:
        db.add(
            models.Task(
                ProjectUID=project_uid,
                TaskName=imported_task.name,
                OutlineLevel=imported_task.outline_level,
                OutlineNumber=imported_task.outline_number,
                WBS=imported_task.wbs,
                IsSummary=imported_task.is_summary,
                Predecessors=imported_task.predecessors,
                ResourceNames=imported_task.resource_names,
                Start=imported_task.start,
                Finish=imported_task.finish,
                DurationDays=imported_task.duration_days,
                PercentComplete=imported_task.percent_complete,
                Status=imported_task.status,
                IsMilestone=imported_task.is_milestone,
                Notes=imported_task.notes,
                BucketName="",
                LabelsJson="[]",
                ChecklistItemsJson="[]",
                CompletedChecklistItemsJson="[]",
            )
        )

    sync_project_metrics(db, project)
    commit_with_rollback(
        db,
        "Failed to import Microsoft Project XML.",
        source_file_name=imported_project.source_file_name,
    )
    db.refresh(project)
    logger.info(
        "Imported project from Microsoft Project XML.",
        extra={
            "correlationId": correlation_id or "",
            "projectUID": project.ProjectUID,
            "sourceFileName": imported_project.source_file_name,
        },
    )
    serialized_project = serialize_project(get_project(db, project.ProjectUID))
    try:
        admin_service.record_import_event(
            db,
            correlation_id=correlation_id or "",
            source_file_name=imported_project.source_file_name,
            imported_by=imported_project.imported_by,
            status="Succeeded",
            project_uid=serialized_project.ProjectUID,
            project_name=serialized_project.ProjectName,
            task_count=len(serialized_project.tasks),
            message="Project XML imported successfully.",
        )
    except Exception:
        logger.exception(
            "Project import succeeded but recording the import event failed.",
            extra={
                "correlationId": correlation_id or "",
                "projectUID": serialized_project.ProjectUID,
                "sourceFileName": imported_project.source_file_name,
                "importedBy": imported_project.imported_by,
            },
        )
    return serialized_project


def get_project(db: Session, project_id: int) -> models.Project | None:
    return db.scalar(
        select(models.Project)
        .options(selectinload(models.Project.tasks))
        .where(models.Project.ProjectUID == project_id)
    )


def create_project(db: Session, payload: schemas.ProjectCreate) -> schemas.ProjectRead:
    project_data = payload.model_dump(exclude={"ProjectUID"})
    project_data["DurationDays"] = calculate_duration_days(payload.Start, payload.Finish)
    project_data["PercentComplete"] = 0
    project_data["PlannerImportMetadata"] = (
        payload.PlannerImportMetadata.model_dump_json() if payload.PlannerImportMetadata else ""
    )
    project = models.Project(**project_data)
    db.add(project)
    commit_with_rollback(db, "Failed to create project.", project_uid=project.ProjectUID)
    db.refresh(project)
    logger.info("Created project.", extra={"projectUID": project.ProjectUID})
    return serialize_project(get_project(db, project.ProjectUID))


def update_project(db: Session, project: models.Project, payload: schemas.ProjectUpdate) -> schemas.ProjectRead:
    payload_data = payload.model_dump()
    payload_data["PlannerImportMetadata"] = (
        payload.PlannerImportMetadata.model_dump_json() if payload.PlannerImportMetadata else ""
    )
    for key, value in payload_data.items():
        setattr(project, key, value)
    sync_project_metrics(db, project)
    commit_with_rollback(db, "Failed to update project.", project_uid=project.ProjectUID)
    db.refresh(project)
    logger.info("Updated project.", extra={"projectUID": project.ProjectUID})
    return serialize_project(get_project(db, project.ProjectUID))


def delete_project(db: Session, project: models.Project) -> None:
    project_uid = project.ProjectUID
    db.delete(project)
    commit_with_rollback(db, "Failed to delete project.", project_uid=project_uid)
    logger.info("Deleted project.", extra={"projectUID": project_uid})


def get_task(db: Session, task_id: int) -> models.Task | None:
    return db.get(models.Task, task_id)


def create_task(db: Session, payload: schemas.TaskCreate) -> schemas.TaskRead:
    task = models.Task(ProjectUID=payload.ProjectUID, TaskName=payload.TaskName)
    apply_task_payload(task, payload)
    db.add(task)
    db.flush()
    project = get_project(db, task.ProjectUID)
    if project:
        sync_project_metrics(db, project)
    commit_with_rollback(db, "Failed to create task.", task_uid=task.TaskUID, project_uid=payload.ProjectUID)
    db.refresh(task)
    logger.info("Created task.", extra={"taskUID": task.TaskUID, "projectUID": task.ProjectUID})
    return serialize_task(task)


def update_task(db: Session, task: models.Task, payload: schemas.TaskUpdate) -> schemas.TaskRead:
    previous_project_uid = task.ProjectUID
    apply_task_payload(task, payload)
    db.flush()

    current_project = get_project(db, task.ProjectUID)
    if current_project:
        sync_project_metrics(db, current_project)

    if previous_project_uid != task.ProjectUID:
        previous_project = get_project(db, previous_project_uid)
        if previous_project:
            sync_project_metrics(db, previous_project)

    commit_with_rollback(
        db,
        "Failed to update task.",
        task_uid=task.TaskUID,
        project_uid=task.ProjectUID,
    )
    db.refresh(task)
    logger.info("Updated task.", extra={"taskUID": task.TaskUID, "projectUID": task.ProjectUID})
    return serialize_task(task)


def delete_task(db: Session, task: models.Task) -> None:
    task_uid = task.TaskUID
    project_uid = task.ProjectUID
    db.delete(task)
    db.flush()
    project = get_project(db, project_uid)
    if project:
        sync_project_metrics(db, project)
    commit_with_rollback(db, "Failed to delete task.", task_uid=task_uid, project_uid=project_uid)
    logger.info("Deleted task.", extra={"taskUID": task_uid, "projectUID": project_uid})


def import_planner_project(
    db: Session,
    payload: schemas.PlannerImportRequest,
    *,
    imported_by: str,
    project_manager: str,
    correlation_id: str | None = None,
) -> schemas.ProjectRead:
    normalized_imported_by = imported_by.strip() or "Unknown"
    normalized_project_manager = project_manager.strip() or normalized_imported_by

    ensure_manager_exists(db, normalized_project_manager)

    team_member_names = sorted(
        {
            resource_name.strip()
            for task in payload.tasks
            for resource_name in task.ResourceNames.split(",")
            if resource_name.strip()
        }
    )
    if team_member_names:
        ensure_team_members_exist(db, team_member_names)

    project = models.Project(
        ProjectName=payload.ProjectName,
        ProjectManager=normalized_project_manager,
        CreatedDate=date.today(),
        CalendarName="Planner",
        Start=payload.Start,
        Finish=payload.Finish,
        DurationDays=calculate_duration_days(payload.Start, payload.Finish),
        PercentComplete=0,
        Status=payload.Status,
        Priority=payload.Priority,
        Notes=payload.Notes,
        SourceFileName=payload.SourceFileName,
        PlannerImportMetadata=payload.PlannerImportMetadata.model_dump_json(),
    )
    db.add(project)
    db.flush()

    for task in payload.tasks:
        db.add(
            models.Task(
                ProjectUID=project.ProjectUID,
                TaskName=task.TaskName,
                OutlineLevel=1,
                OutlineNumber="",
                WBS="",
                IsSummary=False,
                Predecessors="",
                ResourceNames=task.ResourceNames,
                Start=task.Start,
                Finish=task.Finish,
                DurationDays=calculate_duration_days(task.Start, task.Finish),
                PercentComplete=task.PercentComplete,
                Status=task.Status,
                IsMilestone=False,
                Notes=task.Notes,
                BucketName=task.BucketName,
                LabelsJson=json_list(task.Labels),
                ChecklistItemsJson=json_list(task.ChecklistItems),
                CompletedChecklistItemsJson=json_list(task.CompletedChecklistItems),
            )
        )

    sync_project_metrics(db, project)
    commit_with_rollback(
        db,
        "Failed to import Microsoft Planner workbook.",
        source_file_name=payload.SourceFileName,
    )
    db.refresh(project)
    serialized_project = serialize_project(get_project(db, project.ProjectUID))
    try:
        admin_service.record_import_event(
            db,
            correlation_id=correlation_id or "",
            source_file_name=payload.SourceFileName,
            imported_by=normalized_imported_by,
            status="Succeeded",
            project_uid=serialized_project.ProjectUID,
            project_name=serialized_project.ProjectName,
            task_count=len(serialized_project.tasks),
            message="Planner workbook imported successfully.",
        )
    except Exception:
        logger.exception(
            "Planner import succeeded but recording the import event failed.",
            extra={
                "correlationId": correlation_id or "",
                "projectUID": serialized_project.ProjectUID,
                "sourceFileName": payload.SourceFileName,
                "importedBy": normalized_imported_by,
            },
        )
    return serialized_project


def get_or_create_settings(db: Session, user_id: str) -> models.UserSetting:
    setting = db.get(models.UserSetting, user_id)
    if setting:
        return setting
    settings = get_settings()
    setting = models.UserSetting(user_id=user_id)
    setting.current_user_name = settings.default_user_name
    db.add(setting)
    commit_with_rollback(db, "Failed to create default settings.", user_id=user_id)
    db.refresh(setting)
    logger.info("Created default settings.", extra={"userId": user_id})
    return setting


def serialize_settings(setting: models.UserSetting) -> schemas.UserSettingsRead:
    settings = get_settings()
    return schemas.UserSettingsRead(
        userId=setting.user_id,
        # The active workspace user now comes from backend configuration so the
        # app has a single source of truth instead of competing frontend and DB defaults.
        currentUserName=settings.default_user_name,
        theme=setting.theme,
        dashboardSortField=setting.dashboard_sort_field,
        dashboardSortDirection=setting.dashboard_sort_direction,
    )


def update_settings(
    db: Session, setting: models.UserSetting, payload: schemas.UserSettingsUpdate
) -> schemas.UserSettingsRead:
    # Keep the legacy column in place for compatibility, but treat the backend
    # environment setting as the only configured source of truth for the active user.
    setting.current_user_name = get_settings().default_user_name
    setting.theme = payload.theme
    setting.dashboard_sort_field = payload.dashboardSortField
    setting.dashboard_sort_direction = payload.dashboardSortDirection
    commit_with_rollback(db, "Failed to update settings.", user_id=setting.user_id)
    db.refresh(setting)
    logger.info("Updated settings.", extra={"userId": setting.user_id})
    return serialize_settings(setting)


def serialize_team_member(member: models.TeamMember) -> schemas.TeamMemberRead:
    return schemas.TeamMemberRead(
        memberId=member.member_id,
        displayName=member.display_name,
    )


def get_team_members(db: Session) -> list[schemas.TeamMemberRead]:
    members = db.scalars(select(models.TeamMember).order_by(models.TeamMember.display_name)).all()
    logger.info("Loaded team members.", extra={"memberCount": len(members)})
    return [serialize_team_member(member) for member in members]


def serialize_manager(manager: models.Manager) -> schemas.ManagerRead:
    return schemas.ManagerRead(
        managerId=manager.manager_id,
        displayName=manager.display_name,
    )


def get_managers(db: Session) -> list[schemas.ManagerRead]:
    managers = db.scalars(select(models.Manager).order_by(models.Manager.display_name)).all()
    logger.info("Loaded managers.", extra={"managerCount": len(managers)})
    return [serialize_manager(manager) for manager in managers]


def read_log_file(log_file_path: str | None, max_lines: int = 400) -> schemas.LogFileRead:
    return log_service.read_log_file(log_file_path, max_lines=max_lines)


def read_log_file_with_context(
    log_file_path: str | None,
    *,
    max_lines: int = 400,
    around_timestamp,
    correlation_id: str | None = None,
    window_seconds: int = 180,
) -> schemas.LogFileRead:
    return log_service.read_log_file_with_context(
        log_file_path,
        max_lines=max_lines,
        around_timestamp=around_timestamp,
        correlation_id=correlation_id,
        window_seconds=window_seconds,
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
    # Keep this wrapper in crud.py so existing callers and tests can keep patching
    # one stable import path while the implementation lives in admin_service.py.
    return admin_service.record_import_event(
        db,
        correlation_id=correlation_id,
        source_file_name=source_file_name,
        imported_by=imported_by,
        status=status,
        project_uid=project_uid,
        project_name=project_name,
        task_count=task_count,
        message=message,
        failure_reason=failure_reason,
        technical_details=technical_details,
    )


def get_recent_import_events(db: Session, limit: int = 10) -> list[schemas.ImportEventRead]:
    return admin_service.get_recent_import_events(db, limit=limit)


def get_import_event_summary(db: Session) -> schemas.ImportEventSummaryRead:
    return admin_service.get_import_event_summary(db)


def serialize_user_access(user_access: models.UserAccess) -> schemas.UserAccessRead:
    return admin_service.serialize_user_access(user_access)


def get_or_create_user_access(db: Session, user_name: str) -> models.UserAccess:
    return admin_service.get_or_create_user_access(db, user_name)


def get_user_access_list(db: Session) -> list[schemas.UserAccessRead]:
    return admin_service.get_user_access_list(db)


def get_user_access(db: Session, user_name: str) -> schemas.UserAccessRead:
    return admin_service.get_user_access(db, user_name)


def update_user_access(db: Session, user_name: str, payload: schemas.UserAccessUpdate) -> schemas.UserAccessRead:
    return admin_service.update_user_access(db, user_name, payload)


def get_environment_summary() -> schemas.EnvironmentSummaryRead:
    return admin_service.get_environment_summary()
