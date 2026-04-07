import { useEffect, useMemo, useState } from 'react';
import {
    closestCorners,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    useDraggable,
    useDroppable,
} from '@dnd-kit/core';
import { Alert, Badge, Card, Form } from 'react-bootstrap';
import { ProjectRecord, TaskPayload, TaskRecord } from '../../../shared/types/models';
import { getStatusClass } from '../../../shared/utils/status';
import styles from './ProjectBoardView.module.css';

const SUCCESS_MESSAGE_DURATION = 3000;

interface ProjectBoardViewProps {
    project: ProjectRecord;
    onOpenTask: (task: TaskRecord) => void;
    onTaskSave: (payload: TaskPayload, taskId?: number) => Promise<TaskRecord>;
}

interface BoardTaskCardProps {
    task: TaskRecord;
    isDragging?: boolean;
    onOpenTask: (task: TaskRecord) => void;
    draggable?: boolean;
}

function BoardTaskCard({ task, isDragging = false, onOpenTask, draggable = true }: BoardTaskCardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: String(task.TaskUID),
        data: {
            task,
        },
        disabled: !draggable,
    });

    const transformStyle = transform
        ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={transformStyle}
            className={`${styles.boardCard} ${isDragging ? styles.boardCardDragging : ''}`}
            {...(draggable ? listeners : {})}
            {...(draggable ? attributes : {})}
            onDoubleClick={() => onOpenTask(task)}
        >
            <div className={styles.cardHeader}>
                <div className="fw-semibold">{task.TaskName}</div>
                <Badge bg={getStatusClass(task.Status)}>{task.Status}</Badge>
            </div>
            <div className="small text-body-secondary">{task.ResourceNames || 'Unassigned'}</div>
            <div className={styles.cardMeta}>
                {task.Labels.map((label) => (
                    <Badge key={label} bg="secondary">
                        {label}
                    </Badge>
                ))}
                {task.ChecklistProgress.totalItems > 0 ? (
                    <Badge bg="info">
                        {task.ChecklistProgress.completedItems}/{task.ChecklistProgress.totalItems} checklist
                    </Badge>
                ) : null}
            </div>
        </div>
    );
}

interface BoardColumnProps {
    bucketName: string;
    isActive: boolean;
    tasks: TaskRecord[];
    onOpenTask: (task: TaskRecord) => void;
}

function BoardColumn({ bucketName, isActive, tasks, onOpenTask }: BoardColumnProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: bucketName,
    });

    return (
        <div ref={setNodeRef} className={`${styles.boardColumn} ${isActive || isOver ? styles.columnActive : ''}`}>
            <div className={styles.columnHeader}>
                <div className="fw-semibold">{bucketName}</div>
                <Badge bg="secondary">{tasks.length}</Badge>
            </div>
            <div className={styles.columnBody}>
                {tasks.length === 0 ? <div className={styles.emptyState}>Drop tasks here.</div> : null}
                {tasks.map((task) => (
                    <BoardTaskCard key={task.TaskUID} task={task} onOpenTask={onOpenTask} />
                ))}
            </div>
        </div>
    );
}

export function ProjectBoardView({ project, onOpenTask, onTaskSave }: ProjectBoardViewProps) {
    const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [labelFilter, setLabelFilter] = useState('All');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const boardTasks = useMemo(
        () => project.tasks.filter((task) => !task.IsSummary && task.BucketName.trim().length > 0),
        [project.tasks],
    );
    const bucketNames = useMemo(
        () => Array.from(new Set(boardTasks.map((task) => task.BucketName.trim() || 'Unbucketed'))),
        [boardTasks],
    );
    const availableLabels = useMemo(
        () => Array.from(new Set(boardTasks.flatMap((task) => task.Labels))).sort((left, right) => left.localeCompare(right)),
        [boardTasks],
    );
    const availableStatuses = useMemo(
        () => Array.from(new Set(boardTasks.map((task) => task.Status))).sort((left, right) => left.localeCompare(right)),
        [boardTasks],
    );
    const filteredTasks = useMemo(
        () =>
            boardTasks.filter((task) => {
                const matchesSearch =
                    searchTerm.trim().length === 0 ||
                    task.TaskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    task.ResourceNames.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStatus = statusFilter === 'All' || task.Status === statusFilter;
                const matchesLabel = labelFilter === 'All' || task.Labels.includes(labelFilter);
                return matchesSearch && matchesStatus && matchesLabel;
            }),
        [boardTasks, labelFilter, searchTerm, statusFilter],
    );
    const groupedTasks = useMemo(
        () =>
            bucketNames.reduce<Record<string, TaskRecord[]>>((groups, bucketName) => {
                groups[bucketName] = filteredTasks.filter((task) => (task.BucketName || 'Unbucketed') === bucketName);
                return groups;
            }, {}),
        [bucketNames, filteredTasks],
    );
    const activeTask = useMemo(
        () => boardTasks.find((task) => task.TaskUID === activeTaskId) ?? null,
        [activeTaskId, boardTasks],
    );

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeoutId = window.setTimeout(() => setSuccessMessage(null), SUCCESS_MESSAGE_DURATION);
        return () => window.clearTimeout(timeoutId);
    }, [successMessage]);

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveTaskId(null);

        if (!over) {
            return;
        }

        const task = active.data.current?.task as TaskRecord | undefined;
        const nextBucketName = String(over.id);
        if (!task || task.BucketName === nextBucketName) {
            return;
        }

        await onTaskSave(
            {
                TaskUID: task.TaskUID,
                ProjectUID: task.ProjectUID,
                TaskName: task.TaskName,
                OutlineLevel: task.OutlineLevel,
                OutlineNumber: task.OutlineNumber,
                WBS: task.WBS,
                IsSummary: task.IsSummary,
                Predecessors: task.Predecessors,
                ResourceNames: task.ResourceNames,
                Start: task.Start,
                Finish: task.Finish,
                DurationDays: task.DurationDays,
                PercentComplete: task.PercentComplete,
                Status: task.Status,
                IsMilestone: task.IsMilestone,
                Notes: task.Notes,
                BucketName: nextBucketName,
                Labels: task.Labels,
                ChecklistItems: task.ChecklistItems,
                CompletedChecklistItems: task.CompletedChecklistItems,
                ChecklistProgress: task.ChecklistProgress,
            },
            task.TaskUID,
        );
        setSuccessMessage(`Moved "${task.TaskName}" to ${nextBucketName}.`);
    }

    function handleDragStart(event: DragStartEvent) {
        const task = event.active.data.current?.task as TaskRecord | undefined;
        setActiveTaskId(task?.TaskUID ?? null);
    }

    if (bucketNames.length === 0) {
        return <Alert variant="secondary">This project does not have Planner buckets yet.</Alert>;
    }

    return (
        <div className={styles.boardShell}>
            {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

            <div className={styles.statsGrid}>
                <div>
                    <Card className="shadow-sm border-0 dashboard-panel">
                        <Card.Body>
                            <p className="text-uppercase small text-body-secondary mb-1">Buckets</p>
                            <div className="h4 mb-0">{bucketNames.length}</div>
                        </Card.Body>
                    </Card>
                </div>
                <div>
                    <Card className="shadow-sm border-0 dashboard-panel">
                        <Card.Body>
                            <p className="text-uppercase small text-body-secondary mb-1">Tasks</p>
                            <div className="h4 mb-0">{boardTasks.length}</div>
                        </Card.Body>
                    </Card>
                </div>
                <div>
                    <Card className="shadow-sm border-0 dashboard-panel">
                        <Card.Body>
                            <p className="text-uppercase small text-body-secondary mb-1">Filtered</p>
                            <div className="h4 mb-0">{filteredTasks.length}</div>
                        </Card.Body>
                    </Card>
                </div>
            </div>

            <Card className="shadow-sm border-0 dashboard-panel">
                <Card.Body className={styles.toolbar}>
                    <Form.Group>
                        <Form.Label className="fw-semibold">Search</Form.Label>
                        <Form.Control
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search tasks or assignees"
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Label className="fw-semibold">Status</Form.Label>
                        <Form.Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                            <option value="All">All statuses</option>
                            {availableStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label className="fw-semibold">Label</Form.Label>
                        <Form.Select value={labelFilter} onChange={(event) => setLabelFilter(event.target.value)}>
                            <option value="All">All labels</option>
                            {availableLabels.map((label) => (
                                <option key={label} value={label}>
                                    {label}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Card.Body>
            </Card>

            <DndContext collisionDetection={closestCorners} onDragEnd={(event) => void handleDragEnd(event)} onDragStart={handleDragStart}>
                <div className={styles.boardGrid}>
                    {bucketNames.map((bucketName) => (
                        <BoardColumn
                            key={bucketName}
                            bucketName={bucketName}
                            isActive={activeTask?.BucketName === bucketName}
                            tasks={groupedTasks[bucketName] ?? []}
                            onOpenTask={onOpenTask}
                        />
                    ))}
                </div>
                <DragOverlay>
                    {activeTask ? (
                        <div className={styles.boardOverlay}>
                            <BoardTaskCard task={activeTask} onOpenTask={onOpenTask} isDragging draggable={false} />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
