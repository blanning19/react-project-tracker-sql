import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Nav, Row, Spinner } from 'react-bootstrap';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    buildPermissionContext,
    canEditProject,
    getTaskAccess,
} from '../../../shared/permissions/workspacePermissions';
import {
    BACK_TO_MY_DASHBOARD_LABEL,
    OVERDUE_LABEL,
    PROJECT_SOURCE_MANUAL_LABEL,
} from '../../../shared/constants/projectUi';
import { getProjectTypeLabel, isPlannerProject, projectHasBoardBuckets } from '../../../shared/utils/projectType';
import { getStatusClass } from '../../../shared/utils/status';
import { useProjectData } from '../../dashboard/hooks/useProjectData';
import { useCurrentUser } from '../../auth/context/CurrentUserProvider';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { TaskForm } from '../../tasks/components/TaskForm';
import { ProjectBoardView } from './ProjectBoardView';
import { ProjectOverviewTab } from './ProjectOverviewTab';
import { ProjectPhasesTab } from './ProjectPhasesTab';
import { ProjectTasksTab } from './ProjectTasksTab';
import { ProjectTimelineTab } from './ProjectTimelineTab';
import { buildPhaseSummaries, buildTaskLookup } from './projectDetailUtils';

export function ProjectDetailPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { projectId } = useParams();
    const [searchParams] = useSearchParams();
    const parsedProjectId = Number(projectId);
    const selectedTaskId = Number(searchParams.get('taskId'));
    const origin = searchParams.get('from');
    const { preferences, isLoading: isSettingsLoading } = useThemeSettings();
    const { currentUserName, userAccess, isLoading: isCurrentUserLoading } = useCurrentUser();
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
    } = useProjectData(preferences);
    const [activeTab, setActiveTab] = useState('overview');

    const project = useMemo(
        () => projects.find((item) => item.ProjectUID === parsedProjectId),
        [parsedProjectId, projects],
    );
    const projectForForm = editingProject ?? project ?? null;
    const permissionContext = useMemo(
        () => buildPermissionContext(currentUserName, userAccess),
        [currentUserName, userAccess],
    );
    const projectCanEdit = project ? canEditProject(project, permissionContext) : false;
    const visibleTasks = useMemo(() => project?.tasks ?? [], [project]);
    const showBoardTab = project ? isPlannerProject(project) && projectHasBoardBuckets(project) : false;
    const phaseSummaries = useMemo(() => (project ? buildPhaseSummaries(project.tasks) : []), [project]);
    // Shared timeline/task helpers were extracted so the detail page can focus on
    // navigation, permissions, and deep-link restoration instead of rendering internals.
    const taskLookup = useMemo(() => buildTaskLookup(visibleTasks), [visibleTasks]);
    // Task edit access mirrors the dashboard rules: project owners can edit every
    // task, while assignees can edit only tasks explicitly assigned to them.
    const selectedTaskAccess = editingTask && project ? getTaskAccess(editingTask, project, permissionContext) : null;
    const canEditSelectedTask = selectedTaskAccess?.canEdit ?? false;
    const canViewSelectedTask = selectedTaskAccess?.canView ?? false;
    const isTaskOpen = Boolean(editingTask);
    const backPath = origin === 'home' ? '/' : '/my-dashboard';
    const backLabel = origin === 'home' ? 'Back to Home' : BACK_TO_MY_DASHBOARD_LABEL;
    const flashMessage =
        typeof location.state === 'object' && location.state && 'flashMessage' in location.state
            ? String(location.state.flashMessage)
            : null;
    const modeSummary = useMemo(() => {
        if (activeTab === 'edit-task') {
            return canEditSelectedTask
                ? {
                      label: 'Edit Mode',
                      badge: 'warning' as const,
                      title: 'You are editing a task.',
                      description: 'Task fields are live. Save or cancel to return to the task plan view.',
                  }
                : {
                      label: 'View Mode',
                      badge: 'secondary' as const,
                      title: 'This task is view only.',
                      description: 'You can inspect the task details here, but editing stays limited to owners and assigned users.',
                  };
        }

        if (activeTab === 'overview') {
            return projectCanEdit
                ? {
                      label: 'Edit Enabled',
                      badge: 'success' as const,
                      title: 'Project details are editable in this tab.',
                      description: 'The overview form is live for project owners, so changes here update the project directly.',
                  }
                : {
                      label: 'View Only',
                      badge: 'secondary' as const,
                      title: 'Project details are read only.',
                      description: 'You can review the project summary here, but only the project owner can change the overview fields.',
                  };
        }

        return {
            label: 'View Mode',
            badge: 'info' as const,
            title: activeTab === 'tasks' ? 'You are browsing the task plan.' : 'You are reviewing the timeline.',
            description:
                activeTab === 'tasks'
                    ? 'Use this table to inspect work, assignments, and dependencies before opening a specific task for editing.'
                    : 'The timeline stays presentation-focused so schedule review is separate from editing.',
        };
    }, [activeTab, canEditSelectedTask, projectCanEdit]);

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

        const canEditMatchedTask = getTaskAccess(matchedTask, project, permissionContext).canEdit;
        if (!canEditMatchedTask || editingTask?.TaskUID === matchedTask.TaskUID) {
            return;
        }

        setSelectedProjectId(project.ProjectUID);
        setEditingTask(matchedTask);
        setActiveTab('edit-task');
    }, [editingTask?.TaskUID, permissionContext, project, selectedTaskId, setEditingTask, setSelectedProjectId]);

    useEffect(() => {
        if (!editingTask && activeTab === 'edit-task') {
            setActiveTab('tasks');
        }
    }, [activeTab, editingTask]);

    if (isLoading || isSettingsLoading || isCurrentUserLoading) {
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
                                    {project.SourceFileName || PROJECT_SOURCE_MANUAL_LABEL}
                                </p>
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <Badge bg={modeSummary.badge}>{modeSummary.label}</Badge>
                                    <Badge bg={showBoardTab ? 'primary' : 'secondary'}>{project ? getProjectTypeLabel(project) : 'Manual'}</Badge>
                                    <Badge bg={getStatusClass(project.Status)}>
                                        {project.Status}
                                    </Badge>
                                    {project.IsOverdue ? <Badge bg="danger">{OVERDUE_LABEL}</Badge> : null}
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

            <Row className="g-4 mb-4">
                <Col xl={12}>
                    <Card className="shadow-sm border-0 dashboard-panel project-mode-panel">
                        <Card.Body className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
                            <div>
                                <p className="text-uppercase small text-body-secondary mb-1">Current Mode</p>
                                <h2 className="h5 mb-1">{modeSummary.title}</h2>
                                <p className="mb-0 text-body-secondary">{modeSummary.description}</p>
                            </div>
                            <Badge bg={modeSummary.badge} className="project-mode-pill align-self-start align-self-lg-center">
                                {modeSummary.label}
                            </Badge>
                        </Card.Body>
                    </Card>
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
                        {phaseSummaries.length > 0 ? (
                            <Nav.Item>
                                <Nav.Link eventKey="phases">Phases</Nav.Link>
                            </Nav.Item>
                        ) : null}
                        {showBoardTab ? (
                            <Nav.Item>
                                <Nav.Link eventKey="board">Board</Nav.Link>
                            </Nav.Item>
                        ) : null}
                        <Nav.Item>
                            <Nav.Link eventKey="tasks">Tasks</Nav.Link>
                        </Nav.Item>
                        {isTaskOpen && canEditSelectedTask ? (
                            <Nav.Item>
                                <Nav.Link eventKey="edit-task">Edit Task</Nav.Link>
                            </Nav.Item>
                        ) : null}
                    </Nav>
                </Card.Body>
            </Card>

            {activeTab === 'overview' ? (
                <ProjectOverviewTab
                    isOwner={projectCanEdit}
                    isSaving={isSaving}
                    modeLabel={modeSummary.label}
                    onDeleteProject={handleProjectDelete}
                    onProjectSave={handleProjectSave}
                    onSetEditingProject={() => setEditingProject(project)}
                    project={project}
                    projectForForm={projectForForm}
                />
            ) : null}

            {activeTab === 'timeline' ? <ProjectTimelineTab project={project} /> : null}

            {activeTab === 'phases' ? <ProjectPhasesTab project={project} /> : null}

            {activeTab === 'board' && showBoardTab ? (
                <ProjectBoardView
                    project={project}
                    onOpenTask={(task) => {
                        setSelectedProjectId(project.ProjectUID);
                        setEditingTask(task);
                        setActiveTab('edit-task');
                    }}
                    onTaskSave={handleTaskSave}
                />
            ) : null}

            {activeTab === 'edit-task' && canViewSelectedTask ? (
                <Row className="g-4">
                    <Col lg={12}>
                        <TaskForm
                            task={editingTask}
                            projects={[project]}
                            activeProjectId={project.ProjectUID}
                            onSave={handleTaskSave}
                            readOnly={!canEditSelectedTask}
                            onClear={() => {
                                setEditingTask(null);
                                setActiveTab('tasks');
                            }}
                            showCreateAction={false}
                        />
                    </Col>
                </Row>
            ) : null}

            {activeTab === 'tasks' ? (
                <ProjectTasksTab
                    permissionContext={permissionContext}
                    project={project}
                    projectCanEdit={projectCanEdit}
                    isTaskOpen={isTaskOpen}
                    modeLabel={modeSummary.label}
                    onOpenTask={(task) => {
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
