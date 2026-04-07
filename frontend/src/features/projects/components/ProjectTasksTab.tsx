import { Alert, Badge, Button, Card, Table } from 'react-bootstrap';
import { ProjectRecord, TaskRecord } from '../../../shared/types/models';
import { formatDate } from '../../../shared/utils/date';
import { PermissionContext, canEditTask } from '../../../shared/permissions/workspacePermissions';
import { getStatusClass } from '../../../shared/utils/status';
import { renderDependencyBadges } from './projectDetailUtils';

interface ProjectTasksTabProps {
    permissionContext: PermissionContext;
    project: ProjectRecord;
    projectCanEdit: boolean;
    isTaskOpen: boolean;
    modeLabel: string;
    onOpenTask: (task: TaskRecord) => void;
    onNewTask: () => void;
    taskLookup: Map<string, string>;
    visibleTasks: TaskRecord[];
}

export function ProjectTasksTab({
    permissionContext,
    project,
    projectCanEdit,
    isTaskOpen,
    modeLabel,
    onOpenTask,
    onNewTask,
    taskLookup,
    visibleTasks,
}: ProjectTasksTabProps) {
    if (visibleTasks.length === 0) {
        return <Alert variant="secondary">No tasks available for this project yet.</Alert>;
    }

    return (
        <Card className="shadow-sm border-0 dashboard-panel mt-4">
            <Card.Body>
                <div className="d-flex flex-column flex-sm-row gap-3 justify-content-between align-items-sm-center mb-3">
                    <div>
                        <p className="text-uppercase small text-body-secondary mb-1">Tasks</p>
                        <h2 className="h5 mb-0">Project task plan</h2>
                        {!projectCanEdit ? (
                            <p className="mb-0 small text-body-secondary">
                                You can view the full imported project here. Editing still follows ownership and
                                assignment rules.
                            </p>
                        ) : null}
                    </div>
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                        <Badge bg={isTaskOpen ? 'warning' : 'info'}>{modeLabel}</Badge>
                        {projectCanEdit && !isTaskOpen ? (
                            <Button variant="outline-success" onClick={onNewTask}>
                                New Task
                            </Button>
                        ) : null}
                    </div>
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
                                <th className="text-end" />
                            </tr>
                        </thead>
                        <tbody>
                            {visibleTasks.map((task) => {
                                const taskCanEdit = canEditTask(task, project, permissionContext);

                                return (
                                <tr key={task.TaskUID}>
                                    <td>
                                        <div
                                            className={task.IsSummary ? 'fw-semibold' : ''}
                                            style={{ paddingLeft: `${Math.max(0, task.OutlineLevel - 1) * 1.25}rem` }}
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
                                    <td>{renderDependencyBadges(task.Predecessors, taskLookup)}</td>
                                    <td>
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <Badge bg={getStatusClass(task.Status)}>{task.Status}</Badge>
                                            {task.IsOverdue ? <Badge bg="danger">Overdue</Badge> : null}
                                        </div>
                                    </td>
                                    <td>{formatDate(task.Finish)}</td>
                                    <td>{task.PercentComplete}%</td>
                                    <td className="text-end">
                                        <Button
                                            variant={taskCanEdit ? 'outline-primary' : 'outline-secondary'}
                                            size="sm"
                                            onClick={() => onOpenTask(task)}
                                        >
                                            Open Task
                                        </Button>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
    );
}
