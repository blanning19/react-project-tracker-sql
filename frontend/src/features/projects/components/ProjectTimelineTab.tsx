import { Alert, Badge, Card } from 'react-bootstrap';
import { ProjectRecord } from '../../../shared/types/models';
import { formatDate } from '../../../shared/utils/date';
import {
    buildTaskLookup,
    differenceInDays,
    getTaskTypeBadges,
    parseDateValue,
} from './projectDetailUtils';

interface ProjectTimelineTabProps {
    project: ProjectRecord;
}

export function ProjectTimelineTab({ project }: ProjectTimelineTabProps) {
    const visibleTasks = project.tasks;
    const milestones = visibleTasks
        .filter((task) => task.IsMilestone && !task.IsSummary)
        .sort((left, right) => left.Finish.localeCompare(right.Finish));
    const taskLookup = buildTaskLookup(visibleTasks);
    const dependencyRows = visibleTasks
        .filter((task) => task.Predecessors.trim().length > 0)
        .map((task) => ({
            task,
            predecessors: task.Predecessors.split(',')
                .map((value) => value.trim())
                .filter(Boolean),
        }));
    const totalDays = Math.max(1, differenceInDays(project.Start, project.Finish) + 1);
    const ganttRows = visibleTasks.map((task) => {
        const startOffset = differenceInDays(project.Start, task.Start);
        const spanDays = Math.max(1, differenceInDays(task.Start, task.Finish) + 1);
        return {
            task,
            leftPercent: (startOffset / totalDays) * 100,
            widthPercent: (spanDays / totalDays) * 100,
        };
    });
    const tickCount = Math.min(8, totalDays);
    const ganttTicks = Array.from({ length: tickCount }, (_, index) => {
        const dayOffset = Math.round((index / Math.max(1, tickCount - 1)) * (totalDays - 1));
        const tickDate = new Date(parseDateValue(project.Start));
        tickDate.setDate(tickDate.getDate() + dayOffset);
        return {
            label: tickDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            leftPercent: (dayOffset / totalDays) * 100,
        };
    });

    if (milestones.length === 0 && dependencyRows.length === 0 && ganttRows.length === 0) {
        return <Alert variant="secondary">No timeline data available for this project yet.</Alert>;
    }

    return (
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
                                            {getTaskTypeBadges(task)}
                                        </div>
                                        <div className="fw-semibold">{task.TaskName}</div>
                                        {task.Predecessors ? (
                                            <div className="small text-body-secondary">Depends on: {task.Predecessors}</div>
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
                                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">{getTaskTypeBadges(task)}</div>
                                        <div className="fw-semibold">{task.TaskName}</div>
                                    </div>
                                    <div className="dependency-node dependency-node-target">
                                        <div className="dependency-arrow mb-2">Depends on</div>
                                        <div className="d-flex flex-column gap-2">
                                            {predecessors.map((predecessor) => (
                                                <div key={predecessor} className="dependency-target-item">
                                                    <span className="dependency-pill">
                                                        <span className="dependency-pill-code">{predecessor}</span>
                                                        {taskLookup.get(predecessor) ? (
                                                            <span className="dependency-pill-name">{taskLookup.get(predecessor)}</span>
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
                                <p className="text-uppercase small text-body-secondary mb-1">Schedule View</p>
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
                                        style={{ paddingLeft: `${Math.max(0, task.OutlineLevel - 1) * 1.1}rem` }}
                                    >
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            {task.WBS ? <span className="gantt-wbs">{task.WBS}</span> : null}
                                            <span>{task.TaskName}</span>
                                            {task.IsSummary ? (
                                                <Badge bg="warning" text="dark">
                                                    Phase
                                                </Badge>
                                            ) : null}
                                            {task.IsMilestone && !task.IsSummary ? <Badge bg="info">Milestone</Badge> : null}
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
                                            <div className="gantt-milestone" style={{ left: `${leftPercent}%` }} />
                                        ) : (
                                            <div
                                                className={`gantt-bar ${task.IsSummary ? 'gantt-bar-summary' : ''}`}
                                                style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
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
    );
}
