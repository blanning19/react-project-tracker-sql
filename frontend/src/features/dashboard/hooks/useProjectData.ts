import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../shared/api/http';
import { ProjectPayload, ProjectRecord, TaskPayload, TaskRecord, UserSettings } from '../../../shared/types/models';

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
            setProjects(data);
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
            await apiFetch<ProjectRecord>(projectId ? `/projects/${projectId}` : '/projects', {
                method: projectId ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });
            setEditingProject(null);
            await loadProjects();
            setSelectedProjectId(payload.ProjectUID);
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
            const importUserName = settings?.currentUserName ?? 'Ava Patel';
            const importedProject = await apiFetch<ProjectRecord>(
                `/projects/import?user_name=${encodeURIComponent(importUserName)}`,
                {
                    method: 'POST',
                    body: formData,
                },
            );
            setEditingProject(null);
            setEditingTask(null);
            await loadProjects();
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
            await apiFetch<TaskRecord>(taskId ? `/tasks/${taskId}` : '/tasks', {
                method: taskId ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });
            setEditingTask(null);
            await loadProjects();
            setSelectedProjectId(payload.ProjectUID);
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
            await loadProjects();
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
            await loadProjects();
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
