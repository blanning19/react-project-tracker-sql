import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../shared/api/http';
import { DEFAULT_USER_NAME } from '../../../shared/config/app';
import { ProjectPayload, ProjectRecord, TaskPayload, TaskRecord, UserSettings } from '../../../shared/types/models';

function sortTasksByUid(tasks: TaskRecord[]): TaskRecord[] {
    return [...tasks].sort((left, right) => left.TaskUID - right.TaskUID);
}

function calculateDurationDays(start: string, finish: string): number {
    const startDate = new Date(`${start}T00:00:00`);
    const finishDate = new Date(`${finish}T00:00:00`);
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diffInDays = Math.round((finishDate.getTime() - startDate.getTime()) / millisecondsPerDay);
    return Math.max(1, diffInDays);
}

function isProjectOverdue(project: Pick<ProjectRecord, 'Finish' | 'PercentComplete' | 'Status'>): boolean {
    return (
        new Date(project.Finish) < new Date() &&
        project.PercentComplete < 100 &&
        project.Status.toLowerCase() !== 'completed'
    );
}

function deriveProjectMetrics(project: ProjectRecord): ProjectRecord {
    const percentComplete =
        project.tasks.length > 0
            ? Math.round(project.tasks.reduce((sum, task) => sum + task.PercentComplete, 0) / project.tasks.length)
            : 0;

    return {
        ...project,
        DurationDays: calculateDurationDays(project.Start, project.Finish),
        PercentComplete: percentComplete,
        IsOverdue: isProjectOverdue({ ...project, PercentComplete: percentComplete }),
        tasks: sortTasksByUid(project.tasks),
    };
}

function upsertProject(projects: ProjectRecord[], nextProject: ProjectRecord): ProjectRecord[] {
    const normalizedProject = deriveProjectMetrics(nextProject);
    const existingIndex = projects.findIndex((project) => project.ProjectUID === normalizedProject.ProjectUID);

    if (existingIndex === -1) {
        return [...projects, normalizedProject];
    }

    return projects.map((project) =>
        project.ProjectUID === normalizedProject.ProjectUID ? normalizedProject : project,
    );
}

function removeProject(projects: ProjectRecord[], projectId: number): ProjectRecord[] {
    return projects.filter((project) => project.ProjectUID !== projectId);
}

function upsertTask(projects: ProjectRecord[], nextTask: TaskRecord): ProjectRecord[] {
    return projects.map((project) => {
        const existingTask = project.tasks.find((task) => task.TaskUID === nextTask.TaskUID);
        const belongsToProject = project.ProjectUID === nextTask.ProjectUID;

        if (!existingTask && !belongsToProject) {
            return project;
        }

        const nextTasks = belongsToProject
            ? project.tasks.some((task) => task.TaskUID === nextTask.TaskUID)
                ? project.tasks.map((task) => (task.TaskUID === nextTask.TaskUID ? nextTask : task))
                : [...project.tasks.filter((task) => task.TaskUID !== nextTask.TaskUID), nextTask]
            : project.tasks.filter((task) => task.TaskUID !== nextTask.TaskUID);

        return deriveProjectMetrics({ ...project, tasks: nextTasks });
    });
}

function removeTask(projects: ProjectRecord[], taskId: number): ProjectRecord[] {
    return projects.map((project) => {
        if (!project.tasks.some((task) => task.TaskUID === taskId)) {
            return project;
        }

        return deriveProjectMetrics({
            ...project,
            tasks: project.tasks.filter((task) => task.TaskUID !== taskId),
        });
    });
}

export function useProjectData(settings: UserSettings | null) {
    const [projects, setProjects] = useState<ProjectRecord[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>();
    const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
    const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    async function loadProjects() {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiFetch<ProjectRecord[]>('/projects');
            setProjects(data.map(deriveProjectMetrics));
            setSelectedProjectId((current) => current ?? data[0]?.ProjectUID);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadProjects();
    }, []);

    const sortedProjects = useMemo(() => {
        const field = settings?.dashboardSortField ?? 'Finish';
        const direction = settings?.dashboardSortDirection ?? 'asc';
        return [...projects].sort((left, right) => {
            const leftValue = left[field];
            const rightValue = right[field];

            if (typeof leftValue === 'number' && typeof rightValue === 'number') {
                return direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
            }

            return direction === 'asc'
                ? String(leftValue).localeCompare(String(rightValue))
                : String(rightValue).localeCompare(String(leftValue));
        });
    }, [projects, settings?.dashboardSortDirection, settings?.dashboardSortField]);

    async function handleProjectSave(payload: ProjectPayload, projectId?: number) {
        setIsSaving(true);
        setError(null);
        try {
            const savedProject = await apiFetch<ProjectRecord>(projectId ? `/projects/${projectId}` : '/projects', {
                method: projectId ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });
            setEditingProject(null);
            setProjects((currentProjects) => upsertProject(currentProjects, savedProject));
            setSelectedProjectId(savedProject.ProjectUID);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save the project.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleProjectImport(file: File) {
        setIsSaving(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const importUserName = settings?.currentUserName ?? DEFAULT_USER_NAME;
            const importedProject = await apiFetch<ProjectRecord>(
                `/projects/import?user_name=${encodeURIComponent(importUserName)}`,
                {
                    method: 'POST',
                    body: formData,
                },
            );
            setEditingProject(null);
            setEditingTask(null);
            setProjects((currentProjects) => upsertProject(currentProjects, importedProject));
            setSelectedProjectId(importedProject.ProjectUID);
            return importedProject;
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'Unable to import the project file.';
            setError(message);
            throw saveError;
        } finally {
            setIsSaving(false);
        }
    }

    async function handleTaskSave(payload: TaskPayload, taskId?: number) {
        setIsSaving(true);
        setError(null);
        try {
            const savedTask = await apiFetch<TaskRecord>(taskId ? `/tasks/${taskId}` : '/tasks', {
                method: taskId ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });
            setEditingTask(null);
            // Task saves update only the affected project graph locally, which is
            // much cheaper than reloading the full workspace list every time.
            setProjects((currentProjects) => upsertTask(currentProjects, savedTask));
            setSelectedProjectId(savedTask.ProjectUID);
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save the task.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDeleteProject(projectId: number) {
        setIsSaving(true);
        setError(null);
        try {
            await apiFetch<void>(`/projects/${projectId}`, { method: 'DELETE' });
            if (selectedProjectId === projectId) {
                setSelectedProjectId(undefined);
            }
            setEditingProject(null);
            setEditingTask(null);
            setProjects((currentProjects) => removeProject(currentProjects, projectId));
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete the project.');
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDeleteTask(taskId: number) {
        setIsSaving(true);
        setError(null);
        try {
            await apiFetch<void>(`/tasks/${taskId}`, { method: 'DELETE' });
            setEditingTask(null);
            setProjects((currentProjects) => removeTask(currentProjects, taskId));
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete the task.');
        } finally {
            setIsSaving(false);
        }
    }

    return {
        projects: sortedProjects,
        selectedProjectId,
        setSelectedProjectId,
        editingTask,
        setEditingTask,
        editingProject,
        setEditingProject,
        isLoading,
        error,
        isSaving,
        handleProjectSave,
        handleProjectImport,
        handleTaskSave,
        handleDeleteProject,
        handleDeleteTask,
    };
}
