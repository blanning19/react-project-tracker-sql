import { FormEvent, useEffect, useState } from 'react';
import { Button, Card, Col, Form, Row } from 'react-bootstrap';
import { apiFetch, isAbortError } from '../../../shared/api/http';
import { ProjectRecord, TaskPayload, TaskRecord, TeamMemberRecord } from '../../../shared/types/models';
import { parseAssigneeNames } from '../../../shared/utils/assignees';

interface TaskFormProps {
    task?: TaskRecord | null;
    projects: ProjectRecord[];
    activeProjectId?: number;
    onSave: (payload: TaskPayload, taskId?: number) => Promise<TaskRecord>;
    onClear: () => void;
    showCreateAction?: boolean;
}

const createEmptyTask = (projectId?: number): TaskPayload => ({
    ProjectUID: projectId ?? 0,
    TaskName: '',
    OutlineLevel: 1,
    OutlineNumber: '',
    WBS: '',
    IsSummary: false,
    Predecessors: '',
    ResourceNames: '',
    Start: new Date().toISOString().slice(0, 10),
    Finish: new Date().toISOString().slice(0, 10),
    DurationDays: 1,
    PercentComplete: 0,
    Status: 'Not Started',
    IsMilestone: false,
    Notes: '',
});

function toEditableTask(task: TaskRecord): TaskPayload {
    return {
        TaskUID: task.TaskUID,
        ProjectUID: task.ProjectUID,
        TaskName: task.TaskName,
        OutlineLevel: task.OutlineLevel,
        OutlineNumber: task.OutlineNumber,
        WBS: task.WBS,
        IsSummary: task.IsSummary,
        Predecessors: task.Predecessors,
        ResourceNames: task.ResourceNames,
        Start: task.Start,
        Finish: task.Finish,
        DurationDays: task.DurationDays,
        PercentComplete: task.PercentComplete,
        Status: task.Status,
        IsMilestone: task.IsMilestone,
        Notes: task.Notes,
    };
}

function calculateDurationDays(start: string, finish: string): number {
    const startDate = new Date(`${start}T00:00:00`);
    const finishDate = new Date(`${finish}T00:00:00`);
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diffInDays = Math.round((finishDate.getTime() - startDate.getTime()) / millisecondsPerDay);
    return Math.max(1, diffInDays);
}

export function TaskForm({ task, projects, activeProjectId, onSave, onClear, showCreateAction = true }: TaskFormProps) {
    const [formState, setFormState] = useState<TaskPayload>(createEmptyTask(activeProjectId));
    const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);

    useEffect(() => {
        if (task) {
            setFormState(toEditableTask(task));
        } else {
            setFormState(createEmptyTask(activeProjectId));
        }
    }, [activeProjectId, task]);

    useEffect(() => {
        const controller = new AbortController();

        apiFetch<TeamMemberRecord[]>('/team-members', { signal: controller.signal })
            .then(setTeamMembers)
            .catch((error) => {
                if (isAbortError(error)) {
                    return;
                }

                setTeamMembers([]);
            });

        return () => {
            controller.abort();
        };
    }, []);

    const activeProject = projects.find((project) => project.ProjectUID === formState.ProjectUID);
    const selectedAssignees = parseAssigneeNames(formState.ResourceNames);
    const derivedDurationDays = calculateDurationDays(formState.Start, formState.Finish);
    const assigneeOptions = Array.from(
        new Set([...teamMembers.map((member) => member.displayName), ...selectedAssignees]),
    ).sort((left, right) => {
        const leftSelected = selectedAssignees.includes(left);
        const rightSelected = selectedAssignees.includes(right);

        if (leftSelected !== rightSelected) {
            return leftSelected ? -1 : 1;
        }

        return left.localeCompare(right);
    });

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSave({ ...formState, DurationDays: derivedDurationDays }, task?.TaskUID);
        if (!task) {
            setFormState(createEmptyTask(activeProjectId));
        }
    }

    function handleReset() {
        if (task) {
            setFormState(toEditableTask(task));
            return;
        }

        setFormState(createEmptyTask(activeProjectId));
        onClear();
    }

    return (
        <Card className="shadow-sm border-0 h-100 dashboard-panel">
            <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <p className="text-uppercase small text-body-secondary mb-1">Tasks</p>
                        <h2 className="h5 mb-0">{task ? 'Edit Task' : 'Create Task'}</h2>
                    </div>
                    {task && showCreateAction ? (
                        <Button variant="outline-secondary" size="sm" onClick={onClear}>
                            New task
                        </Button>
                    ) : null}
                </div>
                <Form onSubmit={handleSubmit}>
                    <Row className="g-3">
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Project</Form.Label>
                                <Form.Control
                                    value={
                                        activeProject
                                            ? `${activeProject.ProjectUID} - ${activeProject.ProjectName}`
                                            : String(formState.ProjectUID || '')
                                    }
                                    readOnly
                                    plaintext
                                />
                                <Form.Text className="text-body-secondary">
                                    Tasks are created within the currently selected project.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Task Name</Form.Label>
                                <Form.Control
                                    value={formState.TaskName}
                                    onChange={(event) => setFormState({ ...formState, TaskName: event.target.value })}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Assignees</Form.Label>
                                <Form.Select
                                    multiple
                                    value={selectedAssignees}
                                    onChange={(event) => {
                                        const nextAssignees = Array.from(
                                            event.target.selectedOptions,
                                            (option) => option.value,
                                        );
                                        setFormState({ ...formState, ResourceNames: nextAssignees.join(', ') });
                                    }}
                                >
                                    {assigneeOptions.map((displayName) => (
                                        <option key={displayName} value={displayName}>
                                            {displayName}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-body-secondary">
                                    Hold `Ctrl` on Windows or `Command` on Mac to select multiple assignees.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Dependencies</Form.Label>
                                <Form.Control value={formState.Predecessors || 'None'} readOnly plaintext />
                                <Form.Text className="text-body-secondary">
                                    Imported dependency labels are shown here for reference and are not edited in this
                                    form.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Start</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={formState.Start}
                                    onChange={(event) => setFormState({ ...formState, Start: event.target.value })}
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
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Duration</Form.Label>
                                <Form.Control
                                    value={`${derivedDurationDays} day${derivedDurationDays === 1 ? '' : 's'}`}
                                    readOnly
                                    plaintext
                                />
                                <Form.Text className="text-body-secondary">
                                    Duration is calculated automatically from the start and finish dates.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Status</Form.Label>
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
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Percent Complete</Form.Label>
                                <Form.Control
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={formState.PercentComplete}
                                    onChange={(event) =>
                                        setFormState({ ...formState, PercentComplete: Number(event.target.value) })
                                    }
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Check
                                id="task-milestone"
                                label="Milestone"
                                checked={formState.IsMilestone}
                                onChange={(event) => setFormState({ ...formState, IsMilestone: event.target.checked })}
                            />
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Notes</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={formState.Notes}
                                    onChange={(event) => setFormState({ ...formState, Notes: event.target.value })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <div className="d-flex gap-2 mt-4">
                        <Button type="submit">{task ? 'Update Task' : 'Create Task'}</Button>
                        <Button type="button" variant="outline-secondary" onClick={handleReset}>
                            Reset
                        </Button>
                    </div>
                </Form>
            </Card.Body>
        </Card>
    );
}
