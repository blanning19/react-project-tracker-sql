import { useCallback, useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { apiFetch } from '../../../shared/api/http';
import { UserAccessPayload, UserAccessRecord } from '../../../shared/types/models';

interface AccessEditorRowProps {
    currentUserName: string;
    userAccess: UserAccessRecord;
    onSaved: (nextRecord: UserAccessRecord) => void;
}

export function AccessEditorRow({ currentUserName, userAccess, onSaved }: AccessEditorRowProps) {
    const [formState, setFormState] = useState<UserAccessPayload>({
        role: userAccess.role,
        canViewAdmin: userAccess.canViewAdmin,
        canViewLogs: userAccess.canViewLogs,
        notes: userAccess.notes,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setFormState({
            role: userAccess.role,
            canViewAdmin: userAccess.canViewAdmin,
            canViewLogs: userAccess.canViewLogs,
            notes: userAccess.notes,
        });
        setSaveError(null);
    }, [userAccess]);

    const isDirty =
        formState.role !== userAccess.role ||
        formState.canViewAdmin !== userAccess.canViewAdmin ||
        formState.canViewLogs !== userAccess.canViewLogs ||
        formState.notes !== userAccess.notes;

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            const saved = await apiFetch<UserAccessRecord>(
                `/admin/access/${encodeURIComponent(userAccess.userName)}?user_name=${encodeURIComponent(currentUserName)}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(formState),
                },
            );
            onSaved(saved);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Unable to save the updated visibility settings.');
        } finally {
            setIsSaving(false);
        }
    }, [currentUserName, formState, onSaved, userAccess.userName]);

    return (
        <tr>
            <td className="fw-semibold align-middle">{userAccess.userName}</td>
            <td className="align-middle access-editor-role-cell">
                <Form.Select
                    size="sm"
                    value={formState.role}
                    onChange={(event) =>
                        setFormState((previousState) => ({ ...previousState, role: event.target.value }))
                    }
                >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Viewer">Viewer</option>
                </Form.Select>
            </td>
            <td className="align-middle text-center">
                <Form.Check
                    type="switch"
                    checked={formState.canViewAdmin}
                    onChange={(event) =>
                        setFormState((previousState) => ({
                            ...previousState,
                            canViewAdmin: event.target.checked,
                        }))
                    }
                    aria-label={`Toggle admin visibility for ${userAccess.userName}`}
                />
            </td>
            <td className="align-middle text-center">
                <Form.Check
                    type="switch"
                    checked={formState.canViewLogs}
                    onChange={(event) =>
                        setFormState((previousState) => ({
                            ...previousState,
                            canViewLogs: event.target.checked,
                        }))
                    }
                    aria-label={`Toggle log visibility for ${userAccess.userName}`}
                />
            </td>
            <td className="align-middle access-editor-notes-cell">
                <Form.Control
                    size="sm"
                    value={formState.notes}
                    onChange={(event) =>
                        setFormState((previousState) => ({ ...previousState, notes: event.target.value }))
                    }
                    placeholder="Optional admin note"
                />
                {saveError ? (
                    <div className="small text-danger mt-2" role="alert">
                        {saveError}
                    </div>
                ) : null}
            </td>
            <td className="align-middle text-end">
                <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={!isDirty || isSaving}
                    onClick={() => void handleSave()}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
            </td>
        </tr>
    );
}
