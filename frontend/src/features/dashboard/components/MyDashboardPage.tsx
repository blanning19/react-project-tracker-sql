import { useMemo } from 'react';
import { Alert, Badge, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { formatDate } from '../../../shared/utils/date';
import { getStatusClass } from '../../../shared/utils/status';
import { ProjectRecord, TaskRecord } from '../../../shared/types/models';
import { useProjectData } from '../hooks/useProjectData';

const sortFieldOptions: Array<keyof ProjectRecord> = ['ProjectName', 'Finish', 'Status', 'PercentComplete', 'Priority'];

interface MyTaskRow {
    project: ProjectRecord;
    task: TaskRecord;
    isOwner: boolean;
}

export function MyDashboardPage() {
    const { settings, setDashboardSort, isLoading: isSettingsLoading } = useThemeSettings();
    const { projects, isLoading, error } = useProjectData(settings);

    const currentUserName = settings?.currentUserName ?? 'Ava Patel';
    const normalizedUserName = currentUserName.toLowerCase();

    const myProjects = useMemo(
        () =>
            projects.filter((project) => {
                const ownsProject = project.ProjectManager.toLowerCase() === normalizedUserName;
                const ownsOpenProject = ownsProject && project.Status.toLowerCase() !== 'completed';
                const hasAssignedTask = project.tasks.some((task) =>
                    task.ResourceNames.toLowerCase().includes(normalizedUserName),
                );

                return ownsOpenProject || hasAssignedTask;
            }),
        [normalizedUserName, projects],
    );

    const myOpenTasks = useMemo<MyTaskRow[]>(
        () =>
            myProjects.flatMap((project) => {
                const isOwner = project.ProjectManager.toLowerCase() === normalizedUserName;

                return project.tasks
                    .filter(
                        (task) =>
                            task.Status.toLowerCase() !== 'completed' &&
                            task.ResourceNames.toLowerCase().includes(normalizedUserName),
                    )
                    .map((task) => ({ project, task, isOwner }));
            }),
        [myProjects, normalizedUserName],
    );

    if (isLoading || isSettingsLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    return (
        <Container fluid="xl" className="pt-3 pt-lg-4 pb-4 pb-lg-5">
            <Row className="g-4 align-items-stretch mb-4">
                <Col xl={12}>
                    <div className="hero-panel rounded-4 shadow-sm h-100 p-4 p-lg-5">
                        <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
                            <div>
                                <p className="text-uppercase small mb-2 hero-kicker">My Work</p>
                                <h1 className="display-6 fw-semibold mb-2">Active projects and assigned tasks.</h1>
                                <p className="mb-0 text-body-secondary">
                                    This view shows the projects you own and the open tasks assigned to you, so you can
                                    jump straight into your active work for {currentUserName}.
                                </p>
                            </div>
                            <Link to="/projects/new" className="btn btn-primary">
                                Create or Import Project
                            </Link>
                        </div>
                    </div>
                </Col>
            </Row>

            {error ? (
                <Alert variant="danger" className="mt-4">
                    {error}
                </Alert>
            ) : null}

            <Card className="shadow-sm border-0 dashboard-panel mb-4">
                <Card.Body>
                    <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
                        <div>
                            <p className="text-uppercase small text-body-secondary mb-1">My Projects</p>
                            <h2 className="h5 mb-0">Projects with active ownership or assigned work</h2>
                        </div>
                        <div className="d-flex flex-column flex-sm-row gap-3 align-items-sm-center">
                            <Form.Group>
                                <Form.Label className="small text-body-secondary mb-1">Sort field</Form.Label>
                                <Form.Select
                                    value={settings?.dashboardSortField ?? 'Finish'}
                                    onChange={(event) =>
                                        void setDashboardSort(
                                            event.target.value as keyof ProjectRecord,
                                            settings?.dashboardSortDirection ?? 'asc',
                                        )
                                    }
                                >
                                    {sortFieldOptions.map((field) => (
                                        <option key={field} value={field}>
                                            {field}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                            <Form.Group>
                                <Form.Label className="small text-body-secondary mb-1">Direction</Form.Label>
                                <Form.Select
                                    value={settings?.dashboardSortDirection ?? 'asc'}
                                    onChange={(event) =>
                                        void setDashboardSort(
                                            settings?.dashboardSortField ?? 'Finish',
                                            event.target.value as 'asc' | 'desc',
                                        )
                                    }
                                >
                                    <option value="asc">Ascending</option>
                                    <option value="desc">Descending</option>
                                </Form.Select>
                            </Form.Group>
                        </div>
                    </div>

                    <div className="table-responsive mt-4">
                        <Table hover className="align-middle mb-0 task-table">
                            <thead>
                                <tr>
                                    <th>Project</th>
                                    <th>Manager</th>
                                    <th>Status</th>
                                    <th>Finish</th>
                                    <th>Priority</th>
                                    <th>My Open Tasks</th>
                                    <th className="text-end">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myProjects.map((project) => (
                                    <tr key={project.ProjectUID}>
                                        <td>
                                            <div className="fw-semibold">{project.ProjectName}</div>
                                            <small className="text-body-secondary">
                                                ProjectUID {project.ProjectUID}
                                            </small>
                                        </td>
                                        <td>{project.ProjectManager}</td>
                                        <td>
                                            <Badge bg={getStatusClass(project.Status, project.IsOverdue)}>
                                                {project.Status}
                                            </Badge>
                                        </td>
                                        <td>{formatDate(project.Finish)}</td>
                                        <td>{project.Priority}</td>
                                        <td>
                                            {
                                                project.tasks.filter(
                                                    (task) =>
                                                        task.Status.toLowerCase() !== 'completed' &&
                                                        task.ResourceNames.toLowerCase().includes(normalizedUserName),
                                                ).length
                                            }
                                        </td>
                                        <td className="text-end">
                                            <Link
                                                to={`/projects/${project.ProjectUID}?from=my-dashboard`}
                                                className="btn btn-outline-primary btn-sm"
                                            >
                                                Open Project
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {myProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center text-body-secondary py-4">
                                            No active projects found for you.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            <Card className="shadow-sm border-0 dashboard-panel">
                <Card.Body>
                    <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center mb-3">
                        <div>
                            <p className="text-uppercase small text-body-secondary mb-1">Open Work</p>
                            <h2 className="h5 mb-0">My incomplete assigned tasks</h2>
                        </div>
                        <p className="mb-0 text-body-secondary small">
                            Open a task to jump directly into its project and edit view.
                        </p>
                    </div>

                    <div className="table-responsive">
                        <Table hover className="align-middle mb-0 task-table">
                            <thead>
                                <tr>
                                    <th>Task</th>
                                    <th>Project</th>
                                    <th>Status</th>
                                    <th>Finish</th>
                                    <th>Complete</th>
                                    <th>Access</th>
                                    <th className="text-end">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myOpenTasks.map(({ project, task, isOwner }) => (
                                    <tr key={task.TaskUID}>
                                        <td>
                                            <div className="fw-semibold">{task.TaskName}</div>
                                            <small className="text-body-secondary">TaskUID {task.TaskUID}</small>
                                        </td>
                                        <td>{project.ProjectName}</td>
                                        <td>
                                            <Badge bg={getStatusClass(task.Status, task.IsOverdue)}>
                                                {task.Status}
                                            </Badge>
                                        </td>
                                        <td>{formatDate(task.Finish)}</td>
                                        <td>{task.PercentComplete}%</td>
                                        <td>{isOwner ? 'Owner' : 'Assigned'}</td>
                                        <td className="text-end">
                                            <Link
                                                to={`/projects/${project.ProjectUID}?from=my-dashboard&taskId=${task.TaskUID}`}
                                                className="btn btn-outline-primary btn-sm"
                                            >
                                                Open Task
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {myOpenTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center text-body-secondary py-4">
                                            No open tasks assigned to you.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
}
