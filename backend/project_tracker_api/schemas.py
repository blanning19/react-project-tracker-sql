from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .config import get_settings

DEFAULT_USER_NAME = get_settings().default_user_name


class TaskBase(BaseModel):
    ProjectUID: int
    TaskName: str
    OutlineLevel: int = Field(ge=1, default=1)
    OutlineNumber: str = ""
    WBS: str = ""
    IsSummary: bool = False
    Predecessors: str = ""
    ResourceNames: str = ""
    Start: date
    Finish: date
    DurationDays: int = Field(ge=1)
    PercentComplete: int = Field(ge=0, le=100)
    Status: str
    IsMilestone: bool = False
    Notes: str = ""

    @model_validator(mode="after")
    def validate_task_dates(self) -> "TaskBase":
        if self.Finish < self.Start:
            raise ValueError("Finish date must be on or after the start date.")
        return self


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
    CalendarName: str = ""
    Start: date
    Finish: date
    DurationDays: int = Field(ge=1)
    PercentComplete: int = Field(ge=0, le=100)
    Status: str
    Priority: str
    Notes: str = ""
    SourceFileName: str

    @model_validator(mode="after")
    def validate_project_dates(self) -> "ProjectBase":
        if self.Finish < self.Start:
            raise ValueError("Finish date must be on or after the start date.")
        return self


class ProjectCreate(ProjectBase):
    ProjectUID: int


class ProjectUpdate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    ProjectUID: int
    CreatedDate: date
    IsOverdue: bool
    tasks: list[TaskRead] = []


class UserSettingsBase(BaseModel):
    currentUserName: str = DEFAULT_USER_NAME
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


class LogLineRead(BaseModel):
    lineNumber: int
    level: str
    timestamp: datetime | None = None
    isContextMatch: bool = False
    content: str


class LogFileRead(BaseModel):
    filePath: str | None
    lines: list[LogLineRead]


class ImportEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    importEventId: int
    createdAt: datetime
    sourceFileName: str
    importedBy: str
    status: str
    projectUid: int | None
    projectName: str
    taskCount: int
    message: str
    failureReason: str
    technicalDetails: str


class ImportEventSummaryRead(BaseModel):
    totalImports: int
    successfulImports: int
    failedImports: int
    lastFailureMessage: str | None


class UserAccessBase(BaseModel):
    userName: str
    role: str
    canViewAdmin: bool = False
    canViewLogs: bool = False
    notes: str = ""


class UserAccessRead(UserAccessBase):
    pass


class UserAccessUpdate(BaseModel):
    role: str
    canViewAdmin: bool
    canViewLogs: bool
    notes: str = ""


class EnvironmentSummaryRead(BaseModel):
    appVersion: str
    adminUserName: str
    logFilePath: str | None
    corsOrigins: list[str]
    databaseBackend: str
    databaseHost: str | None
    databaseName: str | None
    swaggerDocsUrl: str
    openapiJsonUrl: str
    healthUrl: str
