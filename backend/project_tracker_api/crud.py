from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from . import models, schemas


def is_overdue(finish: date, percent_complete: int, status: str) -> bool:
    return finish < date.today() and percent_complete < 100 and status.lower() != "completed"


def calculate_duration_days(start: date, finish: date) -> int:
    return max(1, (finish - start).days)


def calculate_project_percent_complete(tasks: list[models.Task]) -> int:
    if not tasks:
        return 0

    return round(sum(task.PercentComplete for task in tasks) / len(tasks))


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
    projects = db.scalars(select(models.Project).options(selectinload(models.Project.tasks)).order_by(models.Project.ProjectUID)).all()
    return [serialize_project(project) for project in projects]


def get_project(db: Session, project_id: int) -> models.Project | None:
    return db.scalar(select(models.Project).options(selectinload(models.Project.tasks)).where(models.Project.ProjectUID == project_id))


def create_project(db: Session, payload: schemas.ProjectCreate) -> schemas.ProjectRead:
    project_data = payload.model_dump()
    project_data["DurationDays"] = calculate_duration_days(payload.Start, payload.Finish)
    project_data["PercentComplete"] = 0
    project = models.Project(**project_data)
    db.add(project)
    db.commit()
    db.refresh(project)
    return serialize_project(get_project(db, project.ProjectUID))


def update_project(db: Session, project: models.Project, payload: schemas.ProjectUpdate) -> schemas.ProjectRead:
    for key, value in payload.model_dump().items():
        setattr(project, key, value)
    project.DurationDays = calculate_duration_days(project.Start, project.Finish)
    project.PercentComplete = calculate_project_percent_complete(project.tasks)
    db.commit()
    db.refresh(project)
    return serialize_project(get_project(db, project.ProjectUID))


def delete_project(db: Session, project: models.Project) -> None:
    db.delete(project)
    db.commit()


def get_task(db: Session, task_id: int) -> models.Task | None:
    return db.get(models.Task, task_id)


def create_task(db: Session, payload: schemas.TaskCreate) -> schemas.TaskRead:
    task = models.Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


def update_task(db: Session, task: models.Task, payload: schemas.TaskUpdate) -> schemas.TaskRead:
    for key, value in payload.model_dump().items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


def delete_task(db: Session, task: models.Task) -> None:
    db.delete(task)
    db.commit()


def get_or_create_settings(db: Session, user_id: str) -> models.UserSetting:
    setting = db.get(models.UserSetting, user_id)
    if setting:
        return setting
    setting = models.UserSetting(user_id=user_id)
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def serialize_settings(setting: models.UserSetting) -> schemas.UserSettingsRead:
    return schemas.UserSettingsRead(
        userId=setting.user_id,
        currentUserName=setting.current_user_name,
        theme=setting.theme,
        dashboardSortField=setting.dashboard_sort_field,
        dashboardSortDirection=setting.dashboard_sort_direction,
    )


def update_settings(db: Session, setting: models.UserSetting, payload: schemas.UserSettingsUpdate) -> schemas.UserSettingsRead:
    setting.current_user_name = payload.currentUserName
    setting.theme = payload.theme
    setting.dashboard_sort_field = payload.dashboardSortField
    setting.dashboard_sort_direction = payload.dashboardSortDirection
    db.commit()
    db.refresh(setting)
    return serialize_settings(setting)


def serialize_team_member(member: models.TeamMember) -> schemas.TeamMemberRead:
    return schemas.TeamMemberRead(
        memberId=member.member_id,
        displayName=member.display_name,
    )


def get_team_members(db: Session) -> list[schemas.TeamMemberRead]:
    members = db.scalars(select(models.TeamMember).order_by(models.TeamMember.display_name)).all()
    return [serialize_team_member(member) for member in members]


def serialize_manager(manager: models.Manager) -> schemas.ManagerRead:
    return schemas.ManagerRead(
        managerId=manager.manager_id,
        displayName=manager.display_name,
    )


def get_managers(db: Session) -> list[schemas.ManagerRead]:
    managers = db.scalars(select(models.Manager).order_by(models.Manager.display_name)).all()
    return [serialize_manager(manager) for manager in managers]
