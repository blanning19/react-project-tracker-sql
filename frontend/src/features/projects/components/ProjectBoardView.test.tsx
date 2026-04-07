import { act, render, screen, waitFor } from '@testing-library/react';
import { ProjectBoardView } from './ProjectBoardView';
import { ProjectRecord, TaskPayload, TaskRecord } from '../../../shared/types/models';

let dragEndHandler: ((event: { active: { data: { current?: { task?: TaskRecord } } }; over: { id: string } | null }) => void | Promise<void>) | null =
    null;

vi.mock('@dnd-kit/core', async () => {
    const React = await vi.importActual<typeof import('react')>('react');

    return {
        closestCorners: vi.fn(),
        DndContext: ({
            children,
            onDragEnd,
        }: {
            children: React.ReactNode;
            onDragEnd: (event: { active: { data: { current?: { task?: TaskRecord } } }; over: { id: string } | null }) => void;
        }) => {
            dragEndHandler = onDragEnd;
            return <div data-testid="dnd-context">{children}</div>;
        },
        DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        useDraggable: ({ id }: { id: string }) => ({
            attributes: { 'data-draggable-id': id },
            listeners: {},
            setNodeRef: vi.fn(),
            transform: null,
        }),
        useDroppable: () => ({
            isOver: false,
            setNodeRef: vi.fn(),
        }),
    };
});

function buildTask(overrides: Partial<TaskRecord>): TaskRecord {
    return {
        TaskUID: 5001,
        ProjectUID: 1001,
        TaskName: 'Draft copy',
        OutlineLevel: 1,
        OutlineNumber: '1',
        WBS: '1',
        IsSummary: false,
        Predecessors: '',
        ResourceNames: 'Ava Patel',
        Start: '2026-04-10',
        Finish: '2026-04-12',
        DurationDays: 2,
        PercentComplete: 0,
        Status: 'Not Started',
        IsMilestone: false,
        IsOverdue: false,
        Notes: '',
        BucketName: 'Backlog',
        Labels: ['Blue'],
        ChecklistItems: [],
        CompletedChecklistItems: [],
        ChecklistProgress: {
            completedItems: 0,
            totalItems: 0,
            percentComplete: 0,
        },
        ...overrides,
    };
}

const project: ProjectRecord = {
    ProjectUID: 1001,
    ProjectName: 'Planner launch board',
    ProjectManager: 'Ava Patel',
    CreatedDate: '2026-04-07',
    CalendarName: 'Standard',
    Start: '2026-04-10',
    Finish: '2026-04-20',
    DurationDays: 10,
    PercentComplete: 0,
    Status: 'Not Started',
    Priority: 'Medium',
    IsOverdue: false,
    Notes: '',
    SourceFileName: 'planner-export.xlsx',
    PlannerImportMetadata: {
        source: 'planner',
        importedAt: '2026-04-07T10:00:00.000Z',
        bucketCount: 2,
        labelNames: ['Blue'],
    },
    tasks: [buildTask({}), buildTask({ TaskUID: 5002, TaskName: 'Review draft', BucketName: 'Done', Status: 'Completed' })],
};

describe('ProjectBoardView', () => {
    afterEach(() => {
        dragEndHandler = null;
        vi.clearAllMocks();
    });

    it('saves the task with an updated bucket after a drag and drop', async () => {
        const onTaskSave = vi.fn<(_: TaskPayload, __?: number) => Promise<TaskRecord>>().mockResolvedValue(buildTask({ BucketName: 'Done' }));

        render(<ProjectBoardView project={project} onOpenTask={vi.fn()} onTaskSave={onTaskSave} />);

        expect(screen.getByText('Backlog')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(screen.getByText('Draft copy')).toBeInTheDocument();
        expect(dragEndHandler).not.toBeNull();

        await act(async () => {
            await dragEndHandler?.({
                active: {
                    data: {
                        current: {
                            task: project.tasks[0],
                        },
                    },
                },
                over: { id: 'Done' },
            });
        });

        await waitFor(() => {
            expect(onTaskSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    TaskUID: 5001,
                    BucketName: 'Done',
                    TaskName: 'Draft copy',
                }),
                5001,
            );
        });

        expect(await screen.findByText('Moved "Draft copy" to Done.')).toBeInTheDocument();
    });
});
