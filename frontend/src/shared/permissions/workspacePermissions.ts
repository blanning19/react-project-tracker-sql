import { ProjectRecord, TaskRecord, UserAccessRecord } from '../types/models';
import { isTaskAssignedToUser } from '../utils/assignees';

export interface PermissionContext {
    currentUserName: string;
    normalizedCurrentUserName: string;
    userAccess: UserAccessRecord | null;
}

function normalizeName(name: string): string {
    return name.trim().toLowerCase();
}

export function buildPermissionContext(
    currentUserName: string,
    userAccess: UserAccessRecord | null,
): PermissionContext {
    return {
        currentUserName,
        normalizedCurrentUserName: normalizeName(currentUserName),
        userAccess,
    };
}

export function isProjectOwner(project: ProjectRecord, context: PermissionContext): boolean {
    return normalizeName(project.ProjectManager) === context.normalizedCurrentUserName;
}

export function canViewProject(project: ProjectRecord, context: PermissionContext): boolean {
    void project;
    void context;
    return true;
}

export function canEditProject(project: ProjectRecord, context: PermissionContext): boolean {
    return isProjectOwner(project, context);
}

export function canViewTask(task: TaskRecord, project: ProjectRecord, context: PermissionContext): boolean {
    return canViewProject(project, context) && Boolean(task.TaskUID);
}

export function canEditTask(task: TaskRecord, project: ProjectRecord, context: PermissionContext): boolean {
    return canEditProject(project, context) || isTaskAssignedToUser(task.ResourceNames, context.currentUserName);
}

export function getTaskAccess(task: TaskRecord, project: ProjectRecord, context: PermissionContext) {
    const canView = canViewTask(task, project, context);
    const canEdit = canEditTask(task, project, context);

    return {
        canView,
        canEdit,
    };
}

export function countEditableOpenTasks(project: ProjectRecord, context: PermissionContext): number {
    return project.tasks.filter((task) => task.Status.toLowerCase() !== 'completed' && canEditTask(task, project, context)).length;
}

export function hasAssignedTask(project: ProjectRecord, context: PermissionContext): boolean {
    return project.tasks.some((task) => canEditTask(task, project, context));
}

export function getProjectAccess(project: ProjectRecord, context: PermissionContext) {
    const isOwner = isProjectOwner(project, context);
    const canEdit = isOwner;
    const editableOpenTaskCount = countEditableOpenTasks(project, context);

    return {
        isOwner,
        canEdit,
        hasAssignedTask: hasAssignedTask(project, context),
        editableOpenTaskCount,
    };
}

export function canViewAdmin(context: PermissionContext): boolean {
    return Boolean(context.userAccess?.canViewAdmin);
}

export function canViewLogs(context: PermissionContext): boolean {
    return canViewAdmin(context) && Boolean(context.userAccess?.canViewLogs);
}
