from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class TaskBase(BaseModel):
    ProjectUID: int
    TaskName: str
    ResourceNames: str = ""
    Start: date
    Finish: date
    DurationDays: int = Field(ge=1)
    PercentComplete: int = Field(ge=0, le=100)
    Status: str
    IsMilestone: bool = False
    Notes: str = ""


class TaskCreate(TaskBase):
    TaskUID: int


class TaskUpdate(TaskBase):
    pass


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    TaskUID: int
    IsOverdue: bool


class ProjectBase(BaseModel):
    ProjectName: str
    ProjectManager: str
    Start: date
    Finish: date
    DurationDays: int = Field(ge=1)
    PercentComplete: int = Field(ge=0, le=100)
    Status: str
    Priority: str
    Notes: str = ""
    SourceFileName: str


class ProjectCreate(ProjectBase):
    ProjectUID: int


class ProjectUpdate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    ProjectUID: int
    IsOverdue: bool
    tasks: list[TaskRead] = []


class UserSettingsBase(BaseModel):
    currentUserName: str = "Ava Patel"
    theme: str = "light"
    dashboardSortField: str = "Finish"
    dashboardSortDirection: str = "asc"


class UserSettingsRead(UserSettingsBase):
    userId: str


class UserSettingsUpdate(UserSettingsBase):
    userId: str


class TeamMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    memberId: int
    displayName: str


class ManagerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    managerId: int
    displayName: str
