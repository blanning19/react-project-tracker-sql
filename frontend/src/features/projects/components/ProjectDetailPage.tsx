import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Nav, Row, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useProjectData } from '../../dashboard/hooks/useProjectData';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { TaskForm } from '../../tasks/components/TaskForm';
import { formatDate } from '../../../shared/utils/date';
import { getStatusClass } from '../../../shared/utils/status';
import { ProjectForm } from './ProjectForm';

function parseDateValue(value: string) {
    return new Date(`${value}T00:00:00`);
}

function differenceInDays(start: string, end: string) {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diff = parseDateValue(end).getTime() - parseDateValue(start).getTime();
    return Math.max(0, Math.round(diff / millisecondsPerDay));
}

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
    const currentUserName = settings?.currentUserName ?? 'Ava Patel';
    const isOwner = project?.ProjectManager.toLowerCase() === currentUserName.toLowerCase();
    const visibleTasks = useMemo(() => project?.tasks ?? [], [project]);
    const phaseSummaries = useMemo(() => {
        if (!project) {
            return [];
        }

        return project.tasks
            .filter((task) => task.IsSummary)
            .map((phase) => {
                const phaseIndex = project.tasks.findIndex((task) => task.TaskUID === phase.TaskUID);
                const nextSiblingIndex = project.tasks.findIndex(
                    (task, taskIndex) =>
                        taskIndex > phaseIndex && task.IsSummary && task.OutlineLevel <= phase.OutlineLevel,
                );
                const descendantTasks = project.tasks.filter((task, taskIndex) => {
                    const isAfterPhase = taskIndex > phaseIndex;
                    const isBeforeNextSibling = nextSiblingIndex === -1 || taskIndex < nextSiblingIndex;
                    return isAfterPhase && isBeforeNextSibling && task.OutlineLevel > phase.OutlineLevel;
                });

                return {
                    phase,
                    taskCount: descendantTasks.filter((task) => !task.IsSummary).length,
                    milestoneCount: descendantTasks.filter((task) => task.IsMilestone && !task.IsSummary).length,
                };
            });
    }, [project]);
    const milestones = useMemo(
        () =>
            visibleTasks
                .filter((task) => task.IsMilestone && !task.IsSummary)
                .sort((left, right) => left.Finish.localeCompare(right.Finish)),
        [visibleTasks],
    );
    const taskLookup = useMemo(() => {
        const entries = new Map<string, string>();
        for (const task of visibleTasks) {
            const label = task.WBS || task.OutlineNumber;
            if (label) {
                entries.set(label, task.TaskName);
            }
        }
        return entries;
    }, [visibleTasks]);
    const dependencyRows = useMemo(
        () =>
            visibleTasks
                .filter((task) => task.Predecessors.trim().length > 0)
                .map((task) => ({
                    task,
                    predecessors: task.Predecessors.split(',')
                        .map((value) => value.trim())
                        .filter(Boolean),
                })),
        [visibleTasks],
    );
    const ganttRows = useMemo(() => {
        if (!project) {
            return [];
        }

        const totalDays = Math.max(1, differenceInDays(project.Start, project.Finish) + 1);
        return visibleTasks.map((task) => {
            const startOffset = differenceInDays(project.Start, task.Start);
            const spanDays = Math.max(1, differenceInDays(task.Start, task.Finish) + 1);
            const leftPercent = (startOffset / totalDays) * 100;
            const widthPercent = (spanDays / totalDays) * 100;
            return {
                task,
                leftPercent,
                widthPercent,
            };
        });
    }, [project, visibleTasks]);
    const ganttTicks = useMemo(() => {
        if (!project) {
            return [];
        }

        const totalDays = Math.max(1, differenceInDays(project.Start, project.Finish) + 1);
        const tickCount = Math.min(8, totalDays);
        return Array.from({ length: tickCount }, (_, index) => {
            const dayOffset = Math.round((index / Math.max(1, tickCount - 1)) * (totalDays - 1));
            const tickDate = new Date(parseDateValue(project.Start));
            tickDate.setDate(tickDate.getDate() + dayOffset);
            return {
                label: tickDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                leftPercent: (dayOffset / totalDays) * 100,
            };
        });
    }, [project]);
    const canEditSelectedTask = editingTask
        ? isOwner || editingTask.ResourceNames.toLowerCase().includes(currentUserName.toLowerCase())
        : false;
    const shouldShowTaskPanel = visibleTasks.length > 1;
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
            setActiveTab('edit-task');
        }
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

    function renderDependencyBadges(predecessors: string) {
        const values = predecessors
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        if (values.length === 0) {
            return <span className="text-body-secondary">-</span>;
        }

        return (
            <div className="d-flex flex-wrap gap-2">
                {values.map((value) => (
                    <span key={value} className="dependency-pill">
                        <span className="dependency-pill-code">{value}</span>
                        {taskLookup.get(value) ? (
                            <span className="dependency-pill-name">{taskLookup.get(value)}</span>
                        ) : null}
                    </span>
                ))}
            </div>
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
                <>
                    <Row className="g-3 mb-4">
                        <Col md={6} xl={3}>
                            <Card className="shadow-sm border-0 dashboard-panel h-100">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Start</p>
                                    <div className="fw-semibold">{formatDate(project.Start)}</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6} xl={3}>
                            <Card className="shadow-sm border-0 dashboard-panel h-100">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Finish</p>
                                    <div className="fw-semibold">{formatDate(project.Finish)}</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6} xl={3}>
                            <Card className="shadow-sm border-0 dashboard-panel h-100">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Duration</p>
                                    <div className="fw-semibold">{project.DurationDays} days</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6} xl={3}>
                            <Card className="shadow-sm border-0 dashboard-panel h-100">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Complete</p>
                                    <div className="fw-semibold">{project.PercentComplete}%</div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {phaseSummaries.length > 0 ? (
                        <Card className="shadow-sm border-0 dashboard-panel mb-4">
                            <Card.Body>
                                <p className="text-uppercase small text-body-secondary mb-1">Phases</p>
                                <h2 className="h5 mb-3">Imported summary phases</h2>
                                <Row className="g-3">
                                    {phaseSummaries.map(({ phase, taskCount, milestoneCount }) => (
                                        <Col lg={4} key={phase.TaskUID}>
                                            <Card className="border-0 shadow-sm h-100">
                                                <Card.Body>
                                                    <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                                                        {phase.WBS ? <Badge bg="secondary">{phase.WBS}</Badge> : null}
                                                        <Badge bg="warning" text="dark">
                                                            Phase
                                                        </Badge>
                                                    </div>
                                                    <div className="fw-semibold mb-1">{phase.TaskName}</div>
                                                    <div className="small text-body-secondary">
                                                        {taskCount} task{taskCount === 1 ? '' : 's'} | {milestoneCount}{' '}
                                                        milestone{milestoneCount === 1 ? '' : 's'}
                                                    </div>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            </Card.Body>
                        </Card>
                    ) : null}

                    <Row className="g-4">
                        <Col lg={12}>
                            <ProjectForm
                                project={projectForForm}
                                onSave={handleProjectSave}
                                onClear={() => setEditingProject(project)}
                                showCreateAction={false}
                                readOnly={!isOwner}
                                footerActions={
                                    isOwner ? (
                                        <Button
                                            variant="outline-danger"
                                            onClick={() => void handleProjectDelete()}
                                            disabled={isSaving}
                                        >
                                            Delete Project
                                        </Button>
                                    ) : undefined
                                }
                            />
                        </Col>
                    </Row>
                </>
            ) : null}

            {activeTab === 'timeline' ? (
                milestones.length > 0 || dependencyRows.length > 0 || ganttRows.length > 0 ? (
                    <>
                        {milestones.length > 0 ? (
                            <Card className="shadow-sm border-0 dashboard-panel mb-4">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Milestones</p>
                                    <h2 className="h5 mb-3">Timeline checkpoints</h2>
                                    <div className="d-flex flex-column gap-3">
                                        {milestones.map((task) => (
                                            <div
                                                key={task.TaskUID}
                                                className="d-flex flex-column flex-lg-row gap-2 justify-content-between border rounded-3 p-3"
                                            >
                                                <div>
                                                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                                        {task.WBS ? <Badge bg="secondary">{task.WBS}</Badge> : null}
                                                        <Badge bg="info">Milestone</Badge>
                                                    </div>
                                                    <div className="fw-semibold">{task.TaskName}</div>
                                                    {task.Predecessors ? (
                                                        <div className="small text-body-secondary">
                                                            Depends on: {task.Predecessors}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="text-lg-end">
                                                    <div className="fw-semibold">{formatDate(task.Finish)}</div>
                                                    <div className="small text-body-secondary">{task.Status}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card.Body>
                            </Card>
                        ) : null}

                        {dependencyRows.length > 0 ? (
                            <Card className="shadow-sm border-0 dashboard-panel mb-4">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Dependencies</p>
                                    <h2 className="h5 mb-3">Dependency breakdown</h2>
                                    <div className="d-flex flex-column gap-3">
                                        {dependencyRows.map(({ task, predecessors }) => (
                                            <div key={task.TaskUID} className="dependency-row">
                                                <div className="dependency-node dependency-node-source">
                                                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                                        {task.WBS ? <Badge bg="secondary">{task.WBS}</Badge> : null}
                                                        {task.IsMilestone ? <Badge bg="info">Milestone</Badge> : null}
                                                    </div>
                                                    <div className="fw-semibold">{task.TaskName}</div>
                                                </div>
                                                <div className="dependency-node dependency-node-target">
                                                    <div className="dependency-arrow mb-2">Depends on</div>
                                                    <div className="d-flex flex-column gap-2">
                                                        {predecessors.map((predecessor) => (
                                                            <div key={predecessor} className="dependency-target-item">
                                                                <span className="dependency-pill">
                                                                    <span className="dependency-pill-code">
                                                                        {predecessor}
                                                                    </span>
                                                                    {taskLookup.get(predecessor) ? (
                                                                        <span className="dependency-pill-name">
                                                                            {taskLookup.get(predecessor)}
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card.Body>
                            </Card>
                        ) : null}

                        {ganttRows.length > 0 ? (
                            <Card className="shadow-sm border-0 dashboard-panel mb-4">
                                <Card.Body>
                                    <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center mb-3">
                                        <div>
                                            <p className="text-uppercase small text-body-secondary mb-1">
                                                Schedule View
                                            </p>
                                            <h2 className="h5 mb-0">Gantt-style timeline</h2>
                                        </div>
                                        <p className="mb-0 small text-body-secondary">
                                            {formatDate(project.Start)} to {formatDate(project.Finish)}
                                        </p>
                                    </div>

                                    <div className="gantt-shell">
                                        <div className="gantt-header">
                                            <div className="gantt-label-col">Task</div>
                                            <div className="gantt-timeline-col">
                                                {ganttTicks.map((tick) => (
                                                    <div
                                                        key={`${tick.label}-${tick.leftPercent}`}
                                                        className="gantt-tick"
                                                        style={{ left: `${tick.leftPercent}%` }}
                                                    >
                                                        <span>{tick.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {ganttRows.map(({ task, leftPercent, widthPercent }) => (
                                            <div key={task.TaskUID} className="gantt-row">
                                                <div
                                                    className={`gantt-label ${task.IsSummary ? 'gantt-label-summary' : ''}`}
                                                    style={{
                                                        paddingLeft: `${Math.max(0, task.OutlineLevel - 1) * 1.1}rem`,
                                                    }}
                                                >
                                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                                        {task.WBS ? (
                                                            <span className="gantt-wbs">{task.WBS}</span>
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
                                                <div className="gantt-track">
                                                    {ganttTicks.map((tick) => (
                                                        <div
                                                            key={`${task.TaskUID}-${tick.label}`}
                                                            className="gantt-grid-line"
                                                            style={{ left: `${tick.leftPercent}%` }}
                                                        />
                                                    ))}
                                                    {task.IsMilestone && !task.IsSummary ? (
                                                        <div
                                                            className="gantt-milestone"
                                                            style={{ left: `${leftPercent}%` }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className={`gantt-bar ${task.IsSummary ? 'gantt-bar-summary' : ''}`}
                                                            style={{
                                                                left: `${leftPercent}%`,
                                                                width: `${widthPercent}%`,
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card.Body>
                            </Card>
                        ) : null}
                    </>
                ) : (
                    <Alert variant="secondary">No timeline data available for this project yet.</Alert>
                )
            ) : null}

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

            {activeTab === 'tasks' && shouldShowTaskPanel ? (
                <Card className="shadow-sm border-0 dashboard-panel mt-4">
                    <Card.Body>
                        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-between align-items-sm-center mb-3">
                            <div>
                                <p className="text-uppercase small text-body-secondary mb-1">Tasks</p>
                                <h2 className="h5 mb-0">Project task plan</h2>
                                {!isOwner ? (
                                    <p className="mb-0 small text-body-secondary">
                                        You can view the full imported project here. Editing still follows ownership and
                                        assignment rules.
                                    </p>
                                ) : null}
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
                                        <th>Depends On</th>
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
                                                <div
                                                    className={task.IsSummary ? 'fw-semibold' : ''}
                                                    style={{
                                                        paddingLeft: `${Math.max(0, task.OutlineLevel - 1) * 1.25}rem`,
                                                    }}
                                                >
                                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                                        {task.WBS ? (
                                                            <small className="text-body-secondary">{task.WBS}</small>
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
                                                <small className="text-body-secondary">TaskUID {task.TaskUID}</small>
                                            </td>
                                            <td>{task.ResourceNames || 'Unassigned'}</td>
                                            <td>{renderDependencyBadges(task.Predecessors)}</td>
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
                                                            setActiveTab('edit-task');
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
            ) : activeTab === 'tasks' ? (
                <Alert variant="secondary">No tasks available for this project yet.</Alert>
            ) : null}
        </Container>
    );
}
