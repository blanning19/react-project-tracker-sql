export type ThemeMode = 'light' | 'dark';
export type SortDirection = 'asc' | 'desc';

export interface UserPreferences {
    theme: ThemeMode;
    dashboardSortField: keyof ProjectRecord;
    dashboardSortDirection: SortDirection;
}

export interface UserSettings extends UserPreferences {
    userId: string;
    currentUserName: string;
}

export interface TeamMemberRecord {
    memberId: number;
    displayName: string;
}

export interface ManagerRecord {
    managerId: number;
    displayName: string;
}

export interface LogLineRecord {
    lineNumber: number;
    level: string;
    timestamp: string | null;
    isContextMatch: boolean;
    correlationId: string | null;
    content: string;
}

export interface LogFileRecord {
    filePath: string | null;
    lines: LogLineRecord[];
}

export interface ImportEventRecord {
    importEventId: number;
    createdAt: string;
    correlationId: string;
    sourceFileName: string;
    importedBy: string;
    status: string;
    projectUid: number | null;
    projectName: string;
    taskCount: number;
    message: string;
    failureReason: string;
    technicalDetails: string;
}

export interface ImportEventSummaryRecord {
    totalImports: number;
    successfulImports: number;
    failedImports: number;
    lastFailureMessage: string | null;
}

export interface UserAccessRecord {
    userName: string;
    role: string;
    canViewAdmin: boolean;
    canViewLogs: boolean;
    notes: string;
}

export interface UserAccessPayload {
    role: string;
    canViewAdmin: boolean;
    canViewLogs: boolean;
    notes: string;
}

export interface EnvironmentSummaryRecord {
    appVersion: string;
    adminUserName: string;
    logFilePath: string | null;
    corsOrigins: string[];
    databaseBackend: string;
    databaseHost: string | null;
    databaseName: string | null;
    swaggerDocsUrl: string;
    openapiJsonUrl: string;
    healthUrl: string;
}

export interface TaskRecord {
    TaskUID: number;
    ProjectUID: number;
    TaskName: string;
    OutlineLevel: number;
    OutlineNumber: string;
    WBS: string;
    IsSummary: boolean;
    Predecessors: string;
    ResourceNames: string;
    Start: string;
    Finish: string;
    DurationDays: number;
    PercentComplete: number;
    Status: string;
    IsMilestone: boolean;
    IsOverdue: boolean;
    Notes: string;
}

export interface ProjectRecord {
    ProjectUID: number;
    ProjectName: string;
    ProjectManager: string;
    CreatedDate: string;
    CalendarName: string;
    Start: string;
    Finish: string;
    DurationDays: number;
    PercentComplete: number;
    Status: string;
    Priority: string;
    IsOverdue: boolean;
    Notes: string;
    SourceFileName: string;
    tasks: TaskRecord[];
}

export type ProjectPayload = Omit<ProjectRecord, 'tasks' | 'IsOverdue' | 'CreatedDate' | 'ProjectUID'> & {
    ProjectUID?: number;
};

export type TaskPayload = Omit<TaskRecord, 'IsOverdue' | 'TaskUID'> & {
    TaskUID?: number;
};
