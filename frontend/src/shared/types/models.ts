export type ThemeMode = 'light' | 'dark';
export type SortDirection = 'asc' | 'desc';

export interface UserSettings {
    userId: string;
    currentUserName: string;
    theme: ThemeMode;
    dashboardSortField: keyof ProjectRecord;
    dashboardSortDirection: SortDirection;
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
    content: string;
}

export interface LogFileRecord {
    filePath: string | null;
    lines: LogLineRecord[];
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

export type ProjectPayload = Omit<ProjectRecord, 'tasks' | 'IsOverdue' | 'CreatedDate'>;
export type TaskPayload = Omit<TaskRecord, 'IsOverdue'>;
