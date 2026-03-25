import { useEffect, useMemo } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useProjectData } from '../../dashboard/hooks/useProjectData';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { TaskForm } from '../../tasks/components/TaskForm';
import { formatDate } from '../../../shared/utils/date';
import { getStatusClass } from '../../../shared/utils/status';
import { ProjectForm } from './ProjectForm';

export function ProjectDetailPage() {
    const navigate = useNavigate();
    const { projectId } = useParams();
    const [searchParams] = useSearchParams();
    const parsedProjectId = Number(projectId);
    const selectedTaskId = Number(searchParams.get('taskId'));
    const origin = searchParams.get('from');
    const { settings, isLoading: isSettingsLoading } = useThemeSettings();
    const {
        projects,
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
        handleTaskSave,
        handleDeleteProject,
        handleDeleteTask,
    } = useProjectData(settings);

    const project = useMemo(
        () => projects.find((item) => item.ProjectUID === parsedProjectId),
        [parsedProjectId, projects],
    );

    const projectForForm = editingProject ?? project ?? null;
    const currentUserName = settings?.currentUserName ?? 'Ava Patel';
    const isOwner = project?.ProjectManager.toLowerCase() === currentUserName.toLowerCase();
    const visibleTasks = project
        ? isOwner
            ? project.tasks
            : project.tasks.filter((task) => task.ResourceNames.toLowerCase().includes(currentUserName.toLowerCase()))
        : [];
    const canEditSelectedTask = editingTask
        ? isOwner || editingTask.ResourceNames.toLowerCase().includes(currentUserName.toLowerCase())
        : false;
    const shouldShowTaskPanel = visibleTasks.length > 1;
    const isTaskOpen = Boolean(editingTask);
    const backPath = origin === 'home' ? '/' : '/my-dashboard';
    const backLabel = origin === 'home' ? 'Back to Home' : 'Back to My Dashboard';

    async function handleProjectDelete() {
        await handleDeleteProject(parsedProjectId);
        navigate('/my-dashboard');
    }

    useEffect(() => {
        if (!project) {
            return;
        }

        if (!Number.isFinite(selectedTaskId)) {
            return;
        }

        const matchedTask = project.tasks.find((task) => task.TaskUID === selectedTaskId);
        if (!matchedTask) {
            return;
        }

        const canEditMatchedTask =
            isOwner || matchedTask.ResourceNames.toLowerCase().includes(currentUserName.toLowerCase());
        if (!canEditMatchedTask) {
            return;
        }

        if (editingTask?.TaskUID !== matchedTask.TaskUID) {
            setSelectedProjectId(project.ProjectUID);
            setEditingTask(matchedTask);
        }
    }, [currentUserName, editingTask?.TaskUID, isOwner, project, selectedTaskId, setEditingTask, setSelectedProjectId]);

    if (isLoading || isSettingsLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    if (!Number.isFinite(parsedProjectId) || !project) {
        return (
            <Container fluid="xl" className="pt-3 pt-lg-4 pb-4 pb-lg-5">
                <Alert variant="warning">Project not found.</Alert>
                <Button variant="outline-primary" onClick={() => navigate(backPath)}>
                    {backLabel}
                </Button>
            </Container>
        );
    }

    return (
        <Container fluid="xl" className="pt-3 pt-lg-4 pb-4 pb-lg-5">
            <Row className="g-4 align-items-stretch mb-4">
                <Col xl={12}>
                    <div className="hero-panel rounded-4 shadow-sm h-100 p-4 p-lg-5">
                        <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-start">
                            <div>
                                <p className="text-uppercase small mb-2 hero-kicker">Project Detail</p>
                                <h1 className="display-6 fw-semibold mb-2">{project.ProjectName}</h1>
                                <p className="mb-2 text-body-secondary">
                                    ProjectUID {project.ProjectUID} | Managed by {project.ProjectManager} | Source{' '}
                                    {project.SourceFileName}
                                </p>
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <Badge bg={getStatusClass(project.Status, project.IsOverdue)}>
                                        {project.Status}
                                    </Badge>
                                    {project.IsOverdue ? <Badge bg="danger">Overdue</Badge> : null}
                                    <Badge bg="secondary">{project.Priority}</Badge>
                                </div>
                            </div>
                            <div className="d-flex gap-2 flex-wrap">
                                <Button variant="outline-secondary" onClick={() => navigate(backPath)}>
                                    {backLabel}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>

            {error ? (
                <Alert variant="danger" className="mt-4">
                    {error}
                </Alert>
            ) : null}

            <Row className="g-4 mb-4">
                <Col lg={3}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100">
                        <Card.Body>
                            <strong>Start</strong>
                            <div>{formatDate(project.Start)}</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100">
                        <Card.Body>
                            <strong>Finish</strong>
                            <div>{formatDate(project.Finish)}</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100">
                        <Card.Body>
                            <strong>Duration</strong>
                            <div>{project.DurationDays} days</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col lg={3}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100">
                        <Card.Body>
                            <strong>Complete</strong>
                            <div>{project.PercentComplete}%</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="shadow-sm border-0 dashboard-panel mb-4">
                <Card.Body>
                    <p className="text-uppercase small text-body-secondary mb-1">Notes</p>
                    <p className="mb-0 text-body-secondary">{project.Notes || 'No project notes entered yet.'}</p>
                </Card.Body>
            </Card>

            {isOwner && !isTaskOpen ? (
                <Row className="g-4">
                    <Col lg={12}>
                        <ProjectForm
                            project={projectForForm}
                            onSave={handleProjectSave}
                            onClear={() => setEditingProject(project)}
                            showCreateAction={false}
                            footerActions={
                                <Button
                                    variant="outline-danger"
                                    onClick={() => void handleProjectDelete()}
                                    disabled={isSaving}
                                >
                                    Delete Project
                                </Button>
                            }
                        />
                    </Col>
                </Row>
            ) : canEditSelectedTask ? (
                <Row className="g-4">
                    <Col lg={12}>
                        <TaskForm
                            task={editingTask}
                            projects={[project]}
                            activeProjectId={project.ProjectUID}
                            onSave={handleTaskSave}
                            onClear={() => {
                                setEditingTask(null);
                                setEditingProject(project);
                            }}
                            showCreateAction={false}
                        />
                    </Col>
                </Row>
            ) : isOwner ? (
                <Row className="g-4">
                    <Col lg={6}>
                        <ProjectForm
                            project={projectForForm}
                            onSave={handleProjectSave}
                            onClear={() => setEditingProject(project)}
                            showCreateAction={false}
                            footerActions={
                                <Button
                                    variant="outline-danger"
                                    onClick={() => void handleProjectDelete()}
                                    disabled={isSaving}
                                >
                                    Delete Project
                                </Button>
                            }
                        />
                    </Col>
                    <Col lg={6}>
                        <TaskForm
                            task={editingTask}
                            projects={[project]}
                            activeProjectId={selectedProjectId ?? project.ProjectUID}
                            onSave={handleTaskSave}
                            onClear={() => {
                                setSelectedProjectId(project.ProjectUID);
                                setEditingTask(null);
                            }}
                            showCreateAction={false}
                        />
                    </Col>
                </Row>
            ) : (
                <Row className="g-4">
                    <Col lg={12}>
                        <ProjectForm
                            project={projectForForm}
                            onSave={handleProjectSave}
                            onClear={() => setEditingProject(project)}
                            showCreateAction={false}
                            readOnly
                        />
                    </Col>
                </Row>
            )}

            {shouldShowTaskPanel ? (
                <Card className="shadow-sm border-0 dashboard-panel mt-4">
                    <Card.Body>
                        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-between align-items-sm-center mb-3">
                            <div>
                                <p className="text-uppercase small text-body-secondary mb-1">Tasks</p>
                                <h2 className="h5 mb-0">
                                    {isOwner ? 'Work inside this project' : 'My tasks in this project'}
                                </h2>
                            </div>
                            {isOwner && !isTaskOpen ? (
                                <Button
                                    variant="outline-success"
                                    onClick={() => {
                                        setSelectedProjectId(project.ProjectUID);
                                        setEditingTask(null);
                                    }}
                                >
                                    New Task
                                </Button>
                            ) : null}
                        </div>

                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0 task-table">
                                <thead>
                                    <tr>
                                        <th>Task</th>
                                        <th>Assigned</th>
                                        <th>Status</th>
                                        <th>Finish</th>
                                        <th>Complete</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleTasks.map((task) => (
                                        <tr key={task.TaskUID}>
                                            <td>
                                                <div className="fw-semibold">{task.TaskName}</div>
                                                <small className="text-body-secondary">TaskUID {task.TaskUID}</small>
                                            </td>
                                            <td>{task.ResourceNames || 'Unassigned'}</td>
                                            <td>
                                                <Badge bg={getStatusClass(task.Status, task.IsOverdue)}>
                                                    {task.Status}
                                                </Badge>
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
                                                    {isOwner ? (
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => void handleDeleteTask(task.TaskUID)}
                                                            disabled={isSaving}
                                                        >
                                                            Delete
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            ) : null}
        </Container>
    );
}
