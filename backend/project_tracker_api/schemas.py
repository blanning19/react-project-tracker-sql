from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .config import get_settings

DEFAULT_USER_NAME = get_settings().default_user_name


class ChecklistProgressModel(BaseModel):
    completedItems: int = 0
    totalItems: int = 0
    percentComplete: int = 0


class PlannerImportMetadataModel(BaseModel):
    source: str = "planner"
    importedAt: datetime | None = None
    bucketCount: int = 0
    labelNames: list[str] = Field(default_factory=list)


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
    BucketName: str = ""
    Labels: list[str] = Field(default_factory=list)
    ChecklistItems: list[str] = Field(default_factory=list)
    CompletedChecklistItems: list[str] = Field(default_factory=list)
    ChecklistProgress: ChecklistProgressModel = Field(default_factory=ChecklistProgressModel)

    @model_validator(mode="after")
    def validate_task_dates(self) -> "TaskBase":
        if self.Finish < self.Start:
            raise ValueError("Finish date must be on or after the start date.")
        return self


class TaskCreate(TaskBase):
    TaskUID: int | None = None


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
    PlannerImportMetadata: PlannerImportMetadataModel | None = None

    @model_validator(mode="after")
    def validate_project_dates(self) -> "ProjectBase":
        if self.Finish < self.Start:
            raise ValueError("Finish date must be on or after the start date.")
        return self


class ProjectCreate(ProjectBase):
    ProjectUID: int | None = None


class ProjectUpdate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    ProjectUID: int
    CreatedDate: date
    IsOverdue: bool
    tasks: list[TaskRead] = []


class PlannerImportTask(BaseModel):
    TaskName: str
    BucketName: str = ""
    ResourceNames: str = ""
    Start: date
    Finish: date
    PercentComplete: int = Field(ge=0, le=100, default=0)
    Status: str = "Not Started"
    Priority: str = "Medium"
    Notes: str = ""
    Labels: list[str] = Field(default_factory=list)
    ChecklistItems: list[str] = Field(default_factory=list)
    CompletedChecklistItems: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_dates(self) -> "PlannerImportTask":
        if self.Finish < self.Start:
            raise ValueError("Planner task finish date must be on or after the start date.")
        return self


class PlannerImportRequest(BaseModel):
    ProjectName: str
    ProjectManager: str
    SourceFileName: str
    ImportedBy: str
    Start: date
    Finish: date
    Status: str
    Priority: str
    Notes: str = ""
    PlannerImportMetadata: PlannerImportMetadataModel = Field(default_factory=PlannerImportMetadataModel)
    tasks: list[PlannerImportTask] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_project_dates(self) -> "PlannerImportRequest":
        if self.Finish < self.Start:
            raise ValueError("Planner project finish date must be on or after the start date.")
        return self


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
    correlationId: str | None = None
    content: str


class LogFileRead(BaseModel):
    filePath: str | None
    lines: list[LogLineRead]


class ImportEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    importEventId: int
    createdAt: datetime
    correlationId: str
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
