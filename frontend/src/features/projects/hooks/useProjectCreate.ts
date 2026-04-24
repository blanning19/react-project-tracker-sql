import { useState } from 'react';
import { apiFetch } from '../../../shared/api/http';
import { ProjectPayload, ProjectRecord } from '../../../shared/types/models';
import { ParsedPlannerProject } from '../utils/plannerParser';

interface UseProjectCreateResult {
    error: string | null;
    isSaving: boolean;
    handleProjectImport: (file: File) => Promise<ProjectRecord>;
    handlePlannerImport: (payload: ParsedPlannerProject) => Promise<ProjectRecord>;
    handleProjectSave: (payload: ProjectPayload) => Promise<ProjectRecord>;
}

export function useProjectCreate(currentUserName: string): UseProjectCreateResult {
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    async function handleProjectSave(payload: ProjectPayload) {
        setIsSaving(true);
        setError(null);
        try {
            // The create page does not need the full dashboard workspace state.
            // Keeping create/import mutations in this small hook avoids loading
            // every project just to save one new record.
            return await apiFetch<ProjectRecord>('/projects', {
                method: 'POST',
                body: JSON.stringify({ ...payload, ProjectUID: undefined }),
            });
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save the project.');
            throw saveError;
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
            // Imports also stay in the lightweight create flow so `/projects/new`
            // can remain fast and independent from the larger project-data hook.
            return await apiFetch<ProjectRecord>(`/projects/import?user_name=${encodeURIComponent(currentUserName)}`, {
                method: 'POST',
                body: formData,
            });
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'Unable to import the project file.';
            setError(message);
            throw saveError;
        } finally {
            setIsSaving(false);
        }
    }

    async function handlePlannerImport(payload: ParsedPlannerProject) {
        setIsSaving(true);
        setError(null);
        try {
            return await apiFetch<ProjectRecord>(`/projects/import-planner?user_name=${encodeURIComponent(currentUserName)}`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'Unable to import the Planner workbook.';
            setError(message);
            throw saveError;
        } finally {
            setIsSaving(false);
        }
    }

    return { error, isSaving, handleProjectImport, handlePlannerImport, handleProjectSave };
}
