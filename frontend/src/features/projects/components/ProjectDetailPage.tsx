import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Nav, Row, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DEFAULT_USER_NAME } from '../../../shared/config/app';
import { isTaskAssignedToUser } from '../../../shared/utils/assignees';
import { getStatusClass } from '../../../shared/utils/status';
import { useProjectData } from '../../dashboard/hooks/useProjectData';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { TaskForm } from '../../tasks/components/TaskForm';
import { ProjectOverviewTab } from './ProjectOverviewTab';
import { ProjectTasksTab } from './ProjectTasksTab';
import { ProjectTimelineTab } from './ProjectTimelineTab';
import { buildTaskLookup } from './projectDetailUtils';

export function ProjectDetailPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { projectId } = useParams();
    const [searchParams] = useSearchParams();
    const parsedProjectId = Number(projectId);
    const selectedTaskId = Number(searchParams.get('taskId'));
    const origin = searchParams.get('from');
    const { settings, isLoading: isSettingsLoading } = useThemeSettings();
    const {
        projects,
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
    const [activeTab, setActiveTab] = useState('overview');

    const project = useMemo(
        () => projects.find((item) => item.ProjectUID === parsedProjectId),
        [parsedProjectId, projects],
    );
    const projectForForm = editingProject ?? project ?? null;
    const currentUserName = settings?.currentUserName ?? DEFAULT_USER_NAME;
    const isOwner = project?.ProjectManager.toLowerCase() === currentUserName.toLowerCase();
    const visibleTasks = useMemo(() => project?.tasks ?? [], [project]);
    // Shared timeline/task helpers were extracted so the detail page can focus on
    // navigation, permissions, and deep-link restoration instead of rendering internals.
    const taskLookup = useMemo(() => buildTaskLookup(visibleTasks), [visibleTasks]);
    // Task edit access mirrors the dashboard rules: project owners can edit every
    // task, while assignees can edit only tasks explicitly assigned to them.
    const canEditSelectedTask = editingTask
        ? isOwner || isTaskAssignedToUser(editingTask.ResourceNames, currentUserName)
        : false;
    const isTaskOpen = Boolean(editingTask);
    const backPath = origin === 'home' ? '/' : '/my-dashboard';
    const backLabel = origin === 'home' ? 'Back to Home' : 'Back to My Dashboard';
    const flashMessage =
        typeof location.state === 'object' && location.state && 'flashMessage' in location.state
            ? String(location.state.flashMessage)
            : null;

    async function handleProjectDelete() {
        await handleDeleteProject(parsedProjectId);
        navigate('/my-dashboard');
    }

    // Deep links from the dashboard or home page can open a task directly. This
    // effect restores that context only when the current user is allowed to edit it.
    useEffect(() => {
        if (!project || !Number.isFinite(selectedTaskId)) {
            return;
        }

        const matchedTask = project.tasks.find((task) => task.TaskUID === selectedTaskId);
        if (!matchedTask) {
            return;
        }

        const canEditMatchedTask = isOwner || isTaskAssignedToUser(matchedTask.ResourceNames, currentUserName);
        if (!canEditMatchedTask || editingTask?.TaskUID === matchedTask.TaskUID) {
            return;
        }

        setSelectedProjectId(project.ProjectUID);
        setEditingTask(matchedTask);
        setActiveTab('edit-task');
    }, [currentUserName, editingTask?.TaskUID, isOwner, project, selectedTaskId, setEditingTask, setSelectedProjectId]);

    useEffect(() => {
        if (!editingTask && activeTab === 'edit-task') {
            setActiveTab('tasks');
        }
    }, [activeTab, editingTask]);

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
                                    {project.SourceFileName || 'Manual entry'}
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

            {flashMessage ? (
                <Alert variant="success" className="mt-4">
                    {flashMessage}
                </Alert>
            ) : null}

            <Card className="shadow-sm border-0 dashboard-panel mb-4">
                <Card.Body className="pb-2">
                    <Nav
                        variant="tabs"
                        activeKey={activeTab}
                        onSelect={(key) => {
                            if (key) {
                                setActiveTab(key);
                            }
                        }}
                        className="project-detail-tabs"
                    >
                        <Nav.Item>
                            <Nav.Link eventKey="overview">Overview</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="timeline">Timeline</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="tasks">Tasks</Nav.Link>
                        </Nav.Item>
                        {isTaskOpen ? (
                            <Nav.Item>
                                <Nav.Link eventKey="edit-task">Edit Task</Nav.Link>
                            </Nav.Item>
                        ) : null}
                    </Nav>
                </Card.Body>
            </Card>

            {activeTab === 'overview' ? (
                <ProjectOverviewTab
                    isOwner={isOwner}
                    isSaving={isSaving}
                    onDeleteProject={handleProjectDelete}
                    onProjectSave={handleProjectSave}
                    onSetEditingProject={() => setEditingProject(project)}
                    project={project}
                    projectForForm={projectForForm}
                />
            ) : null}

            {activeTab === 'timeline' ? <ProjectTimelineTab project={project} /> : null}

            {activeTab === 'edit-task' && canEditSelectedTask ? (
                <Row className="g-4">
                    <Col lg={12}>
                        <TaskForm
                            task={editingTask}
                            projects={[project]}
                            activeProjectId={project.ProjectUID}
                            onSave={handleTaskSave}
                            onClear={() => {
                                setEditingTask(null);
                                setActiveTab('tasks');
                            }}
                            showCreateAction={false}
                        />
                    </Col>
                </Row>
            ) : activeTab === 'edit-task' ? (
                <Row className="g-4">
                    <Col lg={12}>
                        <Alert variant="warning" className="mb-0">
                            You do not have permission to edit this task.
                        </Alert>
                    </Col>
                </Row>
            ) : null}

            {activeTab === 'tasks' ? (
                <ProjectTasksTab
                    isOwner={isOwner}
                    isSaving={isSaving}
                    isTaskOpen={isTaskOpen}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={(task) => {
                        setSelectedProjectId(project.ProjectUID);
                        setEditingTask(task);
                        setActiveTab('edit-task');
                    }}
                    onNewTask={() => {
                        setSelectedProjectId(project.ProjectUID);
                        setEditingTask(null);
                    }}
                    taskLookup={taskLookup}
                    visibleTasks={visibleTasks}
                />
            ) : null}
        </Container>
    );
}
