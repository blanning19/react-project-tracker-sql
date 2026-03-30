import { Badge } from 'react-bootstrap';
import { TaskRecord } from '../../../shared/types/models';

export function parseDateValue(value: string) {
    return new Date(`${value}T00:00:00`);
}

export function differenceInDays(start: string, end: string) {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const diff = parseDateValue(end).getTime() - parseDateValue(start).getTime();
    return Math.max(0, Math.round(diff / millisecondsPerDay));
}

export function buildTaskLookup(tasks: TaskRecord[]) {
    const entries = new Map<string, string>();
    for (const task of tasks) {
        const label = task.WBS || task.OutlineNumber;
        if (label) {
            entries.set(label, task.TaskName);
        }
    }
    return entries;
}

export function renderDependencyBadges(predecessors: string, taskLookup: Map<string, string>) {
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

// Imported plans often use summary rows to describe phases. This helper groups
// descendant tasks under each summary so the overview can describe phase scope.
export function buildPhaseSummaries(tasks: TaskRecord[]) {
    return tasks
        .filter((task) => task.IsSummary)
        .map((phase) => {
            const phaseIndex = tasks.findIndex((task) => task.TaskUID === phase.TaskUID);
            const nextSiblingIndex = tasks.findIndex(
                (task, taskIndex) =>
                    taskIndex > phaseIndex && task.IsSummary && task.OutlineLevel <= phase.OutlineLevel,
            );
            const descendantTasks = tasks.filter((task, taskIndex) => {
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
}

export function getTaskTypeBadges(task: TaskRecord) {
    return (
        <>
            {task.WBS ? <Badge bg="secondary">{task.WBS}</Badge> : null}
            {task.IsSummary ? (
                <Badge bg="warning" text="dark">
                    Phase
                </Badge>
            ) : null}
            {task.IsMilestone && !task.IsSummary ? <Badge bg="info">Milestone</Badge> : null}
        </>
    );
}
