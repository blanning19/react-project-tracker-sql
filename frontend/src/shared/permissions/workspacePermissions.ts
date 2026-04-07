import { ProjectRecord, TaskRecord, UserAccessRecord } from '../types/models';
import { isTaskAssignedToUser } from '../utils/assignees';

export interface PermissionContext {
    currentUserName: string;
    userAccess: UserAccessRecord | null;
}

function normalizeName(name: string): string {
    return name.trim().toLowerCase();
}

export function buildPermissionContext(
    currentUserName: string,
    userAccess: UserAccessRecord | null,
): PermissionContext {
    return { currentUserName, userAccess };
}

export function isProjectOwner(project: ProjectRecord, context: PermissionContext): boolean {
    return normalizeName(project.ProjectManager) === normalizeName(context.currentUserName);
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

export function canViewAdmin(context: PermissionContext): boolean {
    return Boolean(context.userAccess?.canViewAdmin);
}

export function canViewLogs(context: PermissionContext): boolean {
    return canViewAdmin(context) && Boolean(context.userAccess?.canViewLogs);
}
