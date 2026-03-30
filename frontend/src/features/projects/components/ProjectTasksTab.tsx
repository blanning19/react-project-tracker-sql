import { Alert, Badge, Button, Card, Table } from 'react-bootstrap';
import { TaskRecord } from '../../../shared/types/models';
import { formatDate } from '../../../shared/utils/date';
import { getStatusClass } from '../../../shared/utils/status';
import { renderDependencyBadges } from './projectDetailUtils';

interface ProjectTasksTabProps {
    isOwner: boolean;
    isSaving: boolean;
    isTaskOpen: boolean;
    onDeleteTask: (taskId: number) => Promise<void>;
    onEditTask: (task: TaskRecord) => void;
    onNewTask: () => void;
    taskLookup: Map<string, string>;
    visibleTasks: TaskRecord[];
}

export function ProjectTasksTab({
    isOwner,
    isSaving,
    isTaskOpen,
    onDeleteTask,
    onEditTask,
    onNewTask,
    taskLookup,
    visibleTasks,
}: ProjectTasksTabProps) {
    if (visibleTasks.length <= 1) {
        return <Alert variant="secondary">No tasks available for this project yet.</Alert>;
    }

    return (
        <Card className="shadow-sm border-0 dashboard-panel mt-4">
            <Card.Body>
                <div className="d-flex flex-column flex-sm-row gap-3 justify-content-between align-items-sm-center mb-3">
                    <div>
                        <p className="text-uppercase small text-body-secondary mb-1">Tasks</p>
                        <h2 className="h5 mb-0">Project task plan</h2>
                        {!isOwner ? (
                            <p className="mb-0 small text-body-secondary">
                                You can view the full imported project here. Editing still follows ownership and assignment
                                rules.
                            </p>
                        ) : null}
                    </div>
                    {isOwner && !isTaskOpen ? (
                        <Button variant="outline-success" onClick={onNewTask}>
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
                                            style={{ paddingLeft: `${Math.max(0, task.OutlineLevel - 1) * 1.25}rem` }}
                                        >
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                {task.WBS ? <small className="text-body-secondary">{task.WBS}</small> : null}
                                                <span>{task.TaskName}</span>
                                                {task.IsSummary ? (
                                                    <Badge bg="warning" text="dark">
                                                        Phase
                                                    </Badge>
                                                ) : null}
                                                {task.IsMilestone && !task.IsSummary ? <Badge bg="info">Milestone</Badge> : null}
                                            </div>
                                        </div>
                                        <small className="text-body-secondary">TaskUID {task.TaskUID}</small>
                                    </td>
                                    <td>{task.ResourceNames || 'Unassigned'}</td>
                                    <td>{renderDependencyBadges(task.Predecessors, taskLookup)}</td>
                                    <td>
                                        <Badge bg={getStatusClass(task.Status, task.IsOverdue)}>{task.Status}</Badge>
                                    </td>
                                    <td>{formatDate(task.Finish)}</td>
                                    <td>{task.PercentComplete}%</td>
                                    <td className="text-end">
                                        <div className="d-flex gap-2 justify-content-end flex-wrap">
                                            <Button variant="outline-primary" size="sm" onClick={() => onEditTask(task)}>
                                                Edit
                                            </Button>
                                            {isOwner ? (
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => void onDeleteTask(task.TaskUID)}
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
    );
}
