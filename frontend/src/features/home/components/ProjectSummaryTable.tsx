import { Badge, Button, Card, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { SortDirection, ProjectRecord } from '../../../shared/types/models';
import { formatDate } from '../../../shared/utils/date';
import { getStatusClass } from '../../../shared/utils/status';

export type HomeProjectSortField =
    | 'ProjectName'
    | 'ProjectManager'
    | 'CreatedDate'
    | 'Status'
    | 'Finish'
    | 'OpenTasks';

interface ProjectSummaryTableProps {
    projects: ProjectRecord[];
    title: string;
    subtitle: string;
    sortField: HomeProjectSortField;
    sortDirection: SortDirection;
    onSort: (field: HomeProjectSortField) => void;
    actionLabel?: string;
    onAction?: (project: ProjectRecord) => void;
    actionHref?: (project: ProjectRecord) => string;
}

export function ProjectSummaryTable({
    projects,
    title,
    subtitle,
    sortField,
    sortDirection,
    onSort,
    actionLabel,
    onAction,
    actionHref,
}: ProjectSummaryTableProps) {
    function renderSortLabel(label: string, field: HomeProjectSortField) {
        const indicator = sortField === field ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '';
        return (
            <Button
                variant="link"
                className="p-0 text-decoration-none fw-semibold text-body"
                onClick={() => onSort(field)}
            >
                {label}
                {indicator}
            </Button>
        );
    }

    return (
        <Card className="shadow-sm border-0 dashboard-panel">
            <Card.Body>
                <div className="d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-start mb-3">
                    <div>
                        <p className="text-uppercase small text-body-secondary mb-1">Project Table</p>
                        <h2 className="h4 mb-0">{title}</h2>
                    </div>
                    <p className="text-body-secondary small mb-0 text-lg-end">{subtitle}</p>
                </div>
                <div className="table-responsive">
                    <Table hover className="align-middle mb-0">
                        <thead>
                            <tr>
                                <th>{renderSortLabel('Project', 'ProjectName')}</th>
                                <th>{renderSortLabel('Manager', 'ProjectManager')}</th>
                                <th>{renderSortLabel('Create Date', 'CreatedDate')}</th>
                                <th>{renderSortLabel('Status', 'Status')}</th>
                                <th>{renderSortLabel('Finish', 'Finish')}</th>
                                <th>{renderSortLabel('Open Tasks', 'OpenTasks')}</th>
                                {actionLabel ? <th className="text-end">Action</th> : null}
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map((project) => (
                                <tr key={project.ProjectUID}>
                                    <td>
                                        <div className="fw-semibold">{project.ProjectName}</div>
                                        <small className="text-body-secondary">ProjectUID {project.ProjectUID}</small>
                                    </td>
                                    <td>{project.ProjectManager}</td>
                                    <td>{formatDate(project.CreatedDate)}</td>
                                    <td>
                                        <Badge bg={getStatusClass(project.Status, project.IsOverdue)}>
                                            {project.Status}
                                        </Badge>
                                    </td>
                                    <td>{formatDate(project.Finish)}</td>
                                    <td>
                                        {project.tasks.filter((task) => task.Status.toLowerCase() !== 'completed').length}
                                    </td>
                                    {actionLabel ? (
                                        <td className="text-end">
                                            {actionHref ? (
                                                <Button
                                                    as={Link}
                                                    to={actionHref(project)}
                                                    size="sm"
                                                    variant="outline-primary"
                                                >
                                                    {actionLabel}
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline-primary"
                                                    onClick={() => onAction?.(project)}
                                                >
                                                    {actionLabel}
                                                </Button>
                                            )}
                                        </td>
                                    ) : null}
                                </tr>
                            ))}
                            {projects.length === 0 ? (
                                <tr>
                                    <td colSpan={actionLabel ? 7 : 6} className="text-center text-body-secondary py-4">
                                        No projects found.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
    );
}
