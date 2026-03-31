import { useState } from 'react';
import { apiFetch } from '../../../shared/api/http';
import { DEFAULT_USER_NAME } from '../../../shared/config/app';
import { ProjectPayload, ProjectRecord, UserSettings } from '../../../shared/types/models';

interface UseProjectCreateResult {
    error: string | null;
    isSaving: boolean;
    handleProjectImport: (file: File) => Promise<ProjectRecord>;
    handleProjectSave: (payload: ProjectPayload) => Promise<ProjectRecord>;
}

export function useProjectCreate(settings: UserSettings | null): UseProjectCreateResult {
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
            const importUserName = settings?.currentUserName ?? DEFAULT_USER_NAME;
            // Imports also stay in the lightweight create flow so `/projects/new`
            // can remain fast and independent from the larger project-data hook.
            return await apiFetch<ProjectRecord>(`/projects/import?user_name=${encodeURIComponent(importUserName)}`, {
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

    return { error, isSaving, handleProjectImport, handleProjectSave };
}
