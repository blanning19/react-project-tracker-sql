import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { apiFetch } from '../../../shared/api/http';
import { ManagerRecord, ProjectPayload, ProjectRecord } from '../../../shared/types/models';

interface ProjectFormProps {
    project?: ProjectRecord | null;
    onSave: (payload: ProjectPayload, projectId?: number) => Promise<void>;
    onImport?: (file: File) => Promise<void>;
    onClear: () => void;
    showCreateAction?: boolean;
    footerActions?: ReactNode;
    readOnly?: boolean;
}

const createEmptyProject = (): ProjectPayload => ({
    ProjectUID: 0,
    ProjectName: '',
    ProjectManager: '',
    CalendarName: '',
    Start: new Date().toISOString().slice(0, 10),
    Finish: new Date().toISOString().slice(0, 10),
    DurationDays: 1,
    PercentComplete: 0,
    Status: 'Not Started',
    Priority: 'Medium',
    Notes: '',
    SourceFileName: 'demo-project.mpp',
});

function toEditableProject(project: ProjectRecord): ProjectPayload {
    return {
        ProjectUID: project.ProjectUID,
        ProjectName: project.ProjectName,
        ProjectManager: project.ProjectManager,
        CalendarName: project.CalendarName,
        Start: project.Start,
        Finish: project.Finish,
        DurationDays: project.DurationDays,
        PercentComplete: project.PercentComplete,
        Status: project.Status,
        Priority: project.Priority,
        Notes: project.Notes,
        SourceFileName: project.SourceFileName,
    };
}

function calculateDurationDays(start: string, finish: string): number {
    const startDate = new Date(start);
    const finishDate = new Date(finish);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(finishDate.getTime())) {
        return 1;
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.max(1, Math.round((finishDate.getTime() - startDate.getTime()) / millisecondsPerDay));
}

export function ProjectForm({
    project,
    onSave,
    onImport,
    onClear,
    showCreateAction = true,
    footerActions,
    readOnly = false,
}: ProjectFormProps) {
    const [formState, setFormState] = useState<ProjectPayload>(createEmptyProject());
    const [managers, setManagers] = useState<ManagerRecord[]>([]);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        if (project) {
            setFormState(toEditableProject(project));
        } else {
            setFormState(createEmptyProject());
            setImportFile(null);
        }
    }, [project]);

    useEffect(() => {
        apiFetch<ManagerRecord[]>('/managers')
            .then(setManagers)
            .catch(() => setManagers([]));
    }, []);

    const calculatedDurationDays = useMemo(
        () => calculateDurationDays(formState.Start, formState.Finish),
        [formState.Finish, formState.Start],
    );
    const calculatedPercentComplete = useMemo(() => {
        if (!project || project.tasks.length === 0) {
            return 0;
        }

        return Math.round(project.tasks.reduce((sum, task) => sum + task.PercentComplete, 0) / project.tasks.length);
    }, [project]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSave(
            { ...formState, DurationDays: calculatedDurationDays, PercentComplete: calculatedPercentComplete },
            project?.ProjectUID,
        );
        if (!project) {
            setFormState(createEmptyProject());
        }
    }

    function handleReset() {
        if (project) {
            setFormState(toEditableProject(project));
            return;
        }

        setFormState(createEmptyProject());
        setImportFile(null);
        onClear();
    }

    async function handleImport() {
        if (!importFile || !onImport) {
            return;
        }

        setIsImporting(true);
        try {
            await onImport(importFile);
            setImportFile(null);
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <Card className="shadow-sm border-0 h-100 dashboard-panel">
            <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <p className="text-uppercase small text-body-secondary mb-1">Projects</p>
                        <h2 className="h5 mb-0">{project ? 'Edit Project' : 'Create Project'}</h2>
                    </div>
                    {project && showCreateAction && !readOnly ? (
                        <Button variant="outline-secondary" size="sm" onClick={onClear}>
                            New project
                        </Button>
                    ) : null}
                </div>
                <Form onSubmit={handleSubmit}>
                    <Row className="g-3">
                        {!project && !readOnly && onImport ? (
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Import Microsoft Project XML</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept=".xml"
                                        onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                                    />
                                    <Form.Text className="text-body-secondary">
                                        Upload a Microsoft Project XML export to create the project, tasks, managers,
                                        and team members automatically.
                                    </Form.Text>
                                    {importFile ? (
                                        <div className="small text-body-secondary mt-2">
                                            Selected file: <strong>{importFile.name}</strong>
                                        </div>
                                    ) : null}
                                    <div className="d-flex gap-2 mt-2">
                                        <Button
                                            type="button"
                                            variant="outline-primary"
                                            onClick={() => void handleImport()}
                                            disabled={!importFile || isImporting}
                                        >
                                            {isImporting ? 'Importing...' : 'Import From XML'}
                                        </Button>
                                    </div>
                                </Form.Group>
                            </Col>
                        ) : null}
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">SourceFileName</Form.Label>
                                <Form.Control value={formState.SourceFileName} readOnly disabled={readOnly} />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">ProjectName</Form.Label>
                                <Form.Control
                                    value={formState.ProjectName}
                                    onChange={(event) =>
                                        setFormState({ ...formState, ProjectName: event.target.value })
                                    }
                                    required
                                    readOnly={readOnly}
                                    disabled={readOnly}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Project Manager</Form.Label>
                                {readOnly ? (
                                    <Form.Control value={formState.ProjectManager} readOnly disabled />
                                ) : (
                                    <Form.Select
                                        value={formState.ProjectManager}
                                        onChange={(event) =>
                                            setFormState({ ...formState, ProjectManager: event.target.value })
                                        }
                                        required
                                    >
                                        <option value="">Select manager</option>
                                        {managers.map((manager) => (
                                            <option key={manager.managerId} value={manager.displayName}>
                                                {manager.displayName}
                                            </option>
                                        ))}
                                    </Form.Select>
                                )}
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Priority</Form.Label>
                                {readOnly ? (
                                    <Form.Control value={formState.Priority} readOnly disabled />
                                ) : (
                                    <Form.Select
                                        value={formState.Priority}
                                        onChange={(event) =>
                                            setFormState({ ...formState, Priority: event.target.value })
                                        }
                                    >
                                        <option>High</option>
                                        <option>Medium</option>
                                        <option>Low</option>
                                    </Form.Select>
                                )}
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Calendar</Form.Label>
                                <Form.Control
                                    value={formState.CalendarName || 'No calendar metadata'}
                                    readOnly
                                    disabled={readOnly}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Start</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={formState.Start}
                                    onChange={(event) => setFormState({ ...formState, Start: event.target.value })}
                                    readOnly={readOnly}
                                    disabled={readOnly}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Finish</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={formState.Finish}
                                    onChange={(event) => setFormState({ ...formState, Finish: event.target.value })}
                                    readOnly={readOnly}
                                    disabled={readOnly}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">DurationDays</Form.Label>
                                <Form.Control value={calculatedDurationDays} readOnly disabled={readOnly} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Status</Form.Label>
                                {readOnly ? (
                                    <Form.Control value={formState.Status} readOnly disabled />
                                ) : (
                                    <Form.Select
                                        value={formState.Status}
                                        onChange={(event) => setFormState({ ...formState, Status: event.target.value })}
                                    >
                                        <option>Not Started</option>
                                        <option>On Track</option>
                                        <option>In Progress</option>
                                        <option>At Risk</option>
                                        <option>Blocked</option>
                                        <option>Completed</option>
                                    </Form.Select>
                                )}
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">PercentComplete</Form.Label>
                                <Form.Control value={`${calculatedPercentComplete}%`} readOnly disabled={readOnly} />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Notes</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={formState.Notes}
                                    onChange={(event) => setFormState({ ...formState, Notes: event.target.value })}
                                    readOnly={readOnly}
                                    disabled={readOnly}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    {!readOnly ? (
                        <div className="d-flex gap-2 mt-4">
                            <Button type="submit">{project ? 'Update Project' : 'Create Project'}</Button>
                            <Button type="button" variant="outline-secondary" onClick={handleReset}>
                                Reset
                            </Button>
                        </div>
                    ) : null}
                </Form>
                {footerActions && !readOnly ? (
                    <div className="d-flex justify-content-end mt-3">{footerActions}</div>
                ) : null}
            </Card.Body>
        </Card>
    );
}
