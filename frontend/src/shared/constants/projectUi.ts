import { ProjectRecord } from '../types/models';

export const STATUS_OPTIONS = ['Not Started', 'On Track', 'In Progress', 'At Risk', 'Blocked', 'Completed'] as const;
export const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'] as const;

export const DASHBOARD_SORT_FIELDS = [
    'ProjectName',
    'Finish',
    'Status',
    'PercentComplete',
    'Priority',
] as const satisfies ReadonlyArray<keyof ProjectRecord>;

type DashboardSortField = (typeof DASHBOARD_SORT_FIELDS)[number];

export const DASHBOARD_SORT_LABELS: Record<DashboardSortField, string> = {
    ProjectName: 'Project',
    Finish: 'Finish',
    Status: 'Status',
    PercentComplete: 'Percent Complete',
    Priority: 'Priority',
};

export const PROJECT_SOURCE_MANUAL_LABEL = 'Manual entry';
export const CREATE_OR_IMPORT_PROJECT_LABEL = 'Create or Import Project';
export const BACK_TO_MY_DASHBOARD_LABEL = 'Back to My Work';
export const OVERDUE_LABEL = 'Overdue';

export function isCompletedStatus(status: string): boolean {
    return status.trim().toLowerCase() === 'completed';
}
