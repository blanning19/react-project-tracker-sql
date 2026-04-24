import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Row, Spinner, Table } from 'react-bootstrap';
import { ProjectForm } from '../../projects/components/ProjectForm';
import { TaskForm } from '../../tasks/components/TaskForm';
import { SettingsPanel } from '../../settings/components/SettingsPanel';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { apiFetch } from '../../../shared/api/http';
import {
    OVERDUE_LABEL,
    PROJECT_SOURCE_MANUAL_LABEL,
} from '../../../shared/constants/projectUi';
import { ProjectPayload, ProjectRecord, TaskPayload, TaskRecord } from '../../../shared/types/models';
import { formatDate } from '../../../shared/utils/date';
import { getStatusClass } from '../../../shared/utils/status';
import { DashboardSortControls } from './DashboardSortControls';
import { LiveClock } from './LiveClock';
import { OpenProjectsTicker } from './OpenProjectsTicker';

export function DashboardPage() {
    const { preferences, setTheme, setDashboardSort, isLoading: isSettingsLoading } = useThemeSettings();
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
        const field = preferences?.dashboardSortField ?? 'Finish';
        const direction = preferences?.dashboardSortDirection ?? 'asc';
        const next = [...projects].sort((left, right) => {
            const leftValue = left[field];
            const rightValue = right[field];

            if (typeof leftValue === 'number' && typeof rightValue === 'number') {
                return direction === 'asc' ? leftValue - rightValue : rightValue - leftValue;
            }

            return direction === 'asc'
                ? String(leftValue).localeCompare(String(rightValue))
                : String(rightValue).localeCompare(String(leftValue));
        });

        return next;
    }, [preferences?.dashboardSortDirection, preferences?.dashboardSortField, projects]);

    async function handleProjectSave(payload: ProjectPayload, projectId?: number) {
        setIsSaving(true);
        setError(null);
        try {
            const savedProject = await apiFetch<ProjectRecord>(projectId ? `/projects/${projectId}` : '/projects', {
                method: projectId ? 'PUT' : 'POST',
                body: JSON.stringify(projectId ? payload : { ...payload, ProjectUID: undefined }),
            });
            setEditingProject(null);
            await loadProjects();
            setSelectedProjectId(savedProject.ProjectUID);
            return savedProject;
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save the project.');
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
                body: JSON.stringify(taskId ? payload : { ...payload, TaskUID: undefined }),
            });
            setEditingTask(null);
            await loadProjects();
            setSelectedProjectId(savedTask.ProjectUID);
            return savedTask;
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save the task.');
            throw saveError;
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

    if (isLoading || isSettingsLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center app-shell">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    return (
        <div className="app-shell pb-5">
            <Container fluid="xl" className="py-4 py-lg-5">
                <Row className="g-4 align-items-stretch mb-4">
                    <Col xl={8}>
                        <Card className="hero-panel border-0 shadow-sm h-100">
                            <Card.Body>
                                <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
                                    <div>
                                        <p className="text-uppercase small mb-2 hero-kicker">
                                            Project Portfolio Dashboard
                                        </p>
                                        <h1 className="display-6 fw-semibold mb-2">
                                            Track Microsoft Project schedules, overdue work, and task progress in one
                                            responsive view.
                                        </h1>
                                        <p className="mb-0 text-body-secondary">
                                            Feature-based React frontend, Bootstrap UI, saved account preferences, and
                                            Postgres-backed CRUD for Project and Task tables.
                                        </p>
                                    </div>
                                    <div className="d-flex flex-column gap-2 align-items-lg-end">
                                        <LiveClock />
                                        <Button
                                        variant={preferences?.theme === 'dark' ? 'light' : 'dark'}
                                            onClick={() => void setTheme(preferences?.theme === 'dark' ? 'light' : 'dark')}
                                        >
                                            Switch to {preferences?.theme === 'dark' ? 'light' : 'dark'} theme
                                        </Button>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xl={4}>
                        <SettingsPanel />
                    </Col>
                </Row>

                <OpenProjectsTicker projects={sortedProjects} />

                {error ? (
                    <Alert variant="danger" className="mt-4">
                        {error}
                    </Alert>
                ) : null}

                <Row className="g-4 mt-1">
                    <Col lg={6}>
                        <ProjectForm
                            project={editingProject}
                            onSave={handleProjectSave}
                            onClear={() => setEditingProject(null)}
                        />
                    </Col>
                    <Col lg={6}>
                        <TaskForm
                            task={editingTask}
                            projects={sortedProjects}
                            activeProjectId={selectedProjectId}
                            onSave={handleTaskSave}
                            onClear={() => setEditingTask(null)}
                        />
                    </Col>
                </Row>

                <Card className="shadow-sm border-0 mt-4 dashboard-panel">
                    <Card.Body>
                        <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
                            <div>
                                <p className="text-uppercase small text-body-secondary mb-1">Dashboard Grid</p>
                                <h2 className="h5 mb-0">Projects with associated subtasks</h2>
                            </div>
                            <DashboardSortControls
                                sortField={preferences?.dashboardSortField ?? 'Finish'}
                                sortDirection={preferences?.dashboardSortDirection ?? 'asc'}
                                onChange={setDashboardSort}
                            />
                        </div>
                    </Card.Body>
                </Card>

                <Row className="g-4 mt-1">
                    {sortedProjects.map((project) => (
                        <Col key={project.ProjectUID} xl={6}>
                            <Card
                                className={`shadow-sm border-0 project-card h-100 ${selectedProjectId === project.ProjectUID ? 'project-card-active' : ''}`}
                            >
                                <Card.Body>
                                    <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
                                        <div>
                                            <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                                                <Badge bg={getStatusClass(project.Status)}>
                                                    {project.Status}
                                                </Badge>
                                                {project.IsOverdue ? <Badge bg="danger">{OVERDUE_LABEL}</Badge> : null}
                                                <Badge bg="secondary">{project.Priority}</Badge>
                                            </div>
                                            <h3 className="h4 mb-1">{project.ProjectName}</h3>
                                            <p className="mb-0 text-body-secondary">
                                                ProjectUID {project.ProjectUID} | {project.ProjectManager} |{' '}
                                                {project.SourceFileName || PROJECT_SOURCE_MANUAL_LABEL}
                                            </p>
                                        </div>
                                        <div className="d-flex gap-2 flex-wrap align-self-start">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedProjectId(project.ProjectUID);
                                                    setEditingProject(project);
                                                }}
                                            >
                                                Edit project
                                            </Button>
                                            <Button
                                                variant="outline-success"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedProjectId(project.ProjectUID);
                                                    setEditingTask(null);
                                                }}
                                            >
                                                New task
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => void handleDeleteProject(project.ProjectUID)}
                                                disabled={isSaving}
                                            >
                                                Delete project
                                            </Button>
                                        </div>
                                    </div>

                                    <Row className="g-3 mb-3">
                                        <Col sm={6} xl={3}>
                                            <strong>Start</strong>
                                            <div>{formatDate(project.Start)}</div>
                                        </Col>
                                        <Col sm={6} xl={3}>
                                            <strong>Finish</strong>
                                            <div>{formatDate(project.Finish)}</div>
                                        </Col>
                                        <Col sm={6} xl={3}>
                                            <strong>DurationDays</strong>
                                            <div>{project.DurationDays}</div>
                                        </Col>
                                        <Col sm={6} xl={3}>
                                            <strong>PercentComplete</strong>
                                            <div>{project.PercentComplete}%</div>
                                        </Col>
                                    </Row>

                                    <p className="mb-3 text-body-secondary">
                                        {project.Notes || 'No project notes entered yet.'}
                                    </p>

                                    <div className="table-responsive">
                                        <Table hover className="align-middle mb-0 task-table">
                                            <thead>
                                                <tr>
                                                    <th>Task</th>
                                                    <th>Status</th>
                                                    <th>Finish</th>
                                                    <th>Complete</th>
                                                    <th className="text-end">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {project.tasks.map((task) => (
                                                    <tr key={task.TaskUID}>
                                                        <td>
                                                            <div
                                                                className={task.IsSummary ? 'fw-semibold' : ''}
                                                                style={{
                                                                    paddingLeft: `${Math.max(0, task.OutlineLevel - 1) * 1.25}rem`,
                                                                }}
                                                            >
                                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                    {task.WBS ? (
                                                                        <small className="text-body-secondary">
                                                                            {task.WBS}
                                                                        </small>
                                                                    ) : null}
                                                                    <span>{task.TaskName}</span>
                                                                    {task.IsSummary ? (
                                                                        <Badge bg="warning" text="dark">
                                                                            Phase
                                                                        </Badge>
                                                                    ) : null}
                                                                    {task.IsMilestone && !task.IsSummary ? (
                                                                        <Badge bg="info">Milestone</Badge>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                            <small className="text-body-secondary">
                                                                TaskUID {task.TaskUID}
                                                            </small>
                                                            {task.Predecessors ? (
                                                                <small className="d-block text-body-secondary">
                                                                    Depends on: {task.Predecessors}
                                                                </small>
                                                            ) : null}
                                                        </td>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                <Badge bg={getStatusClass(task.Status)}>
                                                                    {task.Status}
                                                                </Badge>
                                                                {task.IsOverdue ? <Badge bg="danger">{OVERDUE_LABEL}</Badge> : null}
                                                            </div>
                                                        </td>
                                                        <td>{formatDate(task.Finish)}</td>
                                                        <td>{task.PercentComplete}%</td>
                                                        <td className="text-end">
                                                            <div className="d-flex gap-2 justify-content-end flex-wrap">
                                                                <Button
                                                                    variant="outline-primary"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedProjectId(project.ProjectUID);
                                                                        setEditingTask(task);
                                                                    }}
                                                                >
                                                                    Edit
                                                                </Button>
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={() => void handleDeleteTask(task.TaskUID)}
                                                                    disabled={isSaving}
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {project.tasks.length === 0 ? (
                                                    <tr>
                                                        <td
                                                            colSpan={5}
                                                            className="text-center text-body-secondary py-4"
                                                        >
                                                            No subtasks yet for this project.
                                                        </td>
                                                    </tr>
                                                ) : null}
                                            </tbody>
                                        </Table>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Container>
        </div>
    );
}
