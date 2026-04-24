import { isCompletedStatus } from '../constants/projectUi';
import { ProjectRecord, TaskRecord } from '../types/models';

export function sortTasksByUid(tasks: TaskRecord[]): TaskRecord[] {
    return [...tasks].sort((left, right) => left.TaskUID - right.TaskUID);
}

export function calculateDurationDays(start: string, finish: string): number {
    const startDate = new Date(`${start}T00:00:00`);
    const finishDate = new Date(`${finish}T00:00:00`);
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diffInDays = Math.round((finishDate.getTime() - startDate.getTime()) / millisecondsPerDay);
    return Math.max(1, diffInDays);
}

export function calculateProjectPercentComplete(tasks: TaskRecord[]): number {
    if (tasks.length === 0) {
        return 0;
    }

    return Math.round(tasks.reduce((sum, task) => sum + task.PercentComplete, 0) / tasks.length);
}

export function isProjectOverdue(project: Pick<ProjectRecord, 'Finish' | 'PercentComplete' | 'Status'>): boolean {
    return (
        new Date(project.Finish) < new Date() &&
        project.PercentComplete < 100 &&
        !isCompletedStatus(project.Status)
    );
}

export function countOpenTasks(tasks: TaskRecord[]): number {
    return tasks.filter((task) => !isCompletedStatus(task.Status)).length;
}

export function normalizeProjectForClient(project: ProjectRecord): ProjectRecord {
    return {
        ...project,
        tasks: sortTasksByUid(project.tasks),
    };
}

export function deriveProjectMetricsForLocalMutation(project: ProjectRecord): ProjectRecord {
    const percentComplete = calculateProjectPercentComplete(project.tasks);

    return {
        ...project,
        DurationDays: calculateDurationDays(project.Start, project.Finish),
        PercentComplete: percentComplete,
        IsOverdue: isProjectOverdue({ ...project, PercentComplete: percentComplete }),
        tasks: sortTasksByUid(project.tasks),
    };
}
