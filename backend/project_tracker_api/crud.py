import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from . import models, schemas

logger = logging.getLogger(__name__)


def is_overdue(finish: date, percent_complete: int, status: str) -> bool:
    return finish < date.today() and percent_complete < 100 and status.lower() != "completed"


def calculate_duration_days(start: date, finish: date) -> int:
    return max(1, (finish - start).days)


def calculate_project_percent_complete(tasks: list[models.Task]) -> int:
    if not tasks:
        return 0

    return round(sum(task.PercentComplete for task in tasks) / len(tasks))


def commit_with_rollback(db: Session, message: str, **context: object) -> None:
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        logger.exception(message, extra={"context": context})
        raise


def get_tasks_for_project(db: Session, project_uid: int) -> list[models.Task]:
    return db.scalars(
        select(models.Task).where(models.Task.ProjectUID == project_uid).order_by(models.Task.TaskUID)
    ).all()


def sync_project_metrics(db: Session, project: models.Project) -> None:
    project.DurationDays = calculate_duration_days(project.Start, project.Finish)
    project.PercentComplete = calculate_project_percent_complete(get_tasks_for_project(db, project.ProjectUID))


def serialize_task(task: models.Task) -> schemas.TaskRead:
    return schemas.TaskRead.model_validate(
        {
            "TaskUID": task.TaskUID,
            "ProjectUID": task.ProjectUID,
            "TaskName": task.TaskName,
            "ResourceNames": task.ResourceNames,
            "Start": task.Start,
            "Finish": task.Finish,
            "DurationDays": task.DurationDays,
            "PercentComplete": task.PercentComplete,
            "Status": task.Status,
            "IsMilestone": task.IsMilestone,
            "Notes": task.Notes,
            "IsOverdue": is_overdue(task.Finish, task.PercentComplete, task.Status),
        }
    )


def serialize_project(project: models.Project) -> schemas.ProjectRead:
    duration_days = calculate_duration_days(project.Start, project.Finish)
    percent_complete = calculate_project_percent_complete(project.tasks)

    return schemas.ProjectRead.model_validate(
        {
            "ProjectUID": project.ProjectUID,
            "ProjectName": project.ProjectName,
            "ProjectManager": project.ProjectManager,
            "Start": project.Start,
            "Finish": project.Finish,
            "DurationDays": duration_days,
            "PercentComplete": percent_complete,
            "Status": project.Status,
            "Priority": project.Priority,
            "Notes": project.Notes,
            "SourceFileName": project.SourceFileName,
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


def get_project(db: Session, project_id: int) -> models.Project | None:
    return db.scalar(
        select(models.Project)
        .options(selectinload(models.Project.tasks))
        .where(models.Project.ProjectUID == project_id)
    )


def create_project(db: Session, payload: schemas.ProjectCreate) -> schemas.ProjectRead:
    project_data = payload.model_dump()
    project_data["DurationDays"] = calculate_duration_days(payload.Start, payload.Finish)
    project_data["PercentComplete"] = 0
    project = models.Project(**project_data)
    db.add(project)
    commit_with_rollback(db, "Failed to create project.", project_uid=payload.ProjectUID)
    db.refresh(project)
    logger.info("Created project.", extra={"projectUID": project.ProjectUID})
    return serialize_project(get_project(db, project.ProjectUID))


def update_project(db: Session, project: models.Project, payload: schemas.ProjectUpdate) -> schemas.ProjectRead:
    for key, value in payload.model_dump().items():
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
    task_data = payload.model_dump()
    task_data["DurationDays"] = calculate_duration_days(payload.Start, payload.Finish)
    task = models.Task(**task_data)
    db.add(task)
    db.flush()
    project = get_project(db, task.ProjectUID)
    if project:
        sync_project_metrics(db, project)
    commit_with_rollback(db, "Failed to create task.", task_uid=payload.TaskUID, project_uid=payload.ProjectUID)
    db.refresh(task)
    logger.info("Created task.", extra={"taskUID": task.TaskUID, "projectUID": task.ProjectUID})
    return serialize_task(task)


def update_task(db: Session, task: models.Task, payload: schemas.TaskUpdate) -> schemas.TaskRead:
    previous_project_uid = task.ProjectUID
    for key, value in payload.model_dump().items():
        setattr(task, key, value)
    task.DurationDays = calculate_duration_days(task.Start, task.Finish)
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


def get_or_create_settings(db: Session, user_id: str) -> models.UserSetting:
    setting = db.get(models.UserSetting, user_id)
    if setting:
        return setting
    setting = models.UserSetting(user_id=user_id)
    db.add(setting)
    commit_with_rollback(db, "Failed to create default settings.", user_id=user_id)
    db.refresh(setting)
    logger.info("Created default settings.", extra={"userId": user_id})
    return setting


def serialize_settings(setting: models.UserSetting) -> schemas.UserSettingsRead:
    return schemas.UserSettingsRead(
        userId=setting.user_id,
        currentUserName=setting.current_user_name,
        theme=setting.theme,
        dashboardSortField=setting.dashboard_sort_field,
        dashboardSortDirection=setting.dashboard_sort_direction,
    )


def update_settings(
    db: Session, setting: models.UserSetting, payload: schemas.UserSettingsUpdate
) -> schemas.UserSettingsRead:
    setting.current_user_name = payload.currentUserName
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
