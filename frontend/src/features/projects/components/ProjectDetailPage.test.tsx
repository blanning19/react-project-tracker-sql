import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectDetailPage } from './ProjectDetailPage';
import { ProjectRecord, TaskRecord } from '../../../shared/types/models';

let dragEndHandler: ((event: { active: { data: { current?: { task?: TaskRecord } } }; over: { id: string } | null }) => void | Promise<void>) | null =
    null;

const {
    mockUseProjectData,
    mockHandleTaskSave,
    mockSetSelectedProjectId,
    mockSetEditingTask,
    mockSetEditingProject,
    mockHandleProjectSave,
    mockHandleDeleteProject,
    mockHandleProjectImport,
    mockHandleDeleteTask,
} = vi.hoisted(() => ({
    mockUseProjectData: vi.fn(),
    mockHandleTaskSave: vi.fn(),
    mockSetSelectedProjectId: vi.fn(),
    mockSetEditingTask: vi.fn(),
    mockSetEditingProject: vi.fn(),
    mockHandleProjectSave: vi.fn(),
    mockHandleDeleteProject: vi.fn(),
    mockHandleProjectImport: vi.fn(),
    mockHandleDeleteTask: vi.fn(),
}));

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
            return <div data-testid="detail-page-dnd-context">{children}</div>;
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

vi.mock('../../auth/context/CurrentUserProvider', () => ({
    useCurrentUser: () => ({
        currentUserName: 'Ava Patel',
        userAccess: {
            userName: 'Ava Patel',
            role: 'Admin',
            canViewAdmin: true,
            canViewLogs: true,
            notes: '',
        },
        isLoading: false,
    }),
}));

vi.mock('../../settings/theme/ThemeProvider', () => ({
    useThemeSettings: () => ({
        preferences: {
            theme: 'light',
            dashboardSortField: 'Finish',
            dashboardSortDirection: 'asc',
        },
        isLoading: false,
    }),
}));

vi.mock('../../dashboard/hooks/useProjectData', () => ({
    useProjectData: mockUseProjectData,
}));

vi.mock('../../../shared/permissions/workspacePermissions', () => ({
    buildPermissionContext: vi.fn(() => ({
        userName: 'Ava Patel',
        role: 'Admin',
    })),
    canEditProject: vi.fn(() => true),
    canEditTask: vi.fn(() => true),
    canViewTask: vi.fn(() => true),
}));

vi.mock('./ProjectOverviewTab', () => ({
    ProjectOverviewTab: () => <div>Overview tab content</div>,
}));

vi.mock('./ProjectTimelineTab', () => ({
    ProjectTimelineTab: () => <div>Timeline tab content</div>,
}));

vi.mock('./ProjectTasksTab', () => ({
    ProjectTasksTab: () => <div>Tasks tab content</div>,
}));

vi.mock('../../tasks/components/TaskForm', () => ({
    TaskForm: () => <div>Task form</div>,
}));

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

const plannerProject: ProjectRecord = {
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

describe('ProjectDetailPage', () => {
    beforeEach(() => {
        vi.mocked(mockHandleTaskSave).mockResolvedValue(buildTask({ BucketName: 'Done' }));
        mockSetSelectedProjectId.mockReset();
        mockSetEditingTask.mockReset();
        mockSetEditingProject.mockReset();
        mockHandleProjectSave.mockReset();
        mockHandleDeleteProject.mockReset();
        mockHandleProjectImport.mockReset();
        mockHandleDeleteTask.mockReset();
    });

    afterEach(() => {
        dragEndHandler = null;
        vi.clearAllMocks();
    });

    it('shows the board tab for Planner projects and routes drag/drop saves through the detail page', async () => {
        const user = userEvent.setup();
        mockUseProjectData.mockReturnValue({
            projects: [plannerProject],
            selectedProjectId: plannerProject.ProjectUID,
            setSelectedProjectId: mockSetSelectedProjectId,
            editingTask: null,
            setEditingTask: mockSetEditingTask,
            editingProject: null,
            setEditingProject: mockSetEditingProject,
            isLoading: false,
            error: null,
            isSaving: false,
            handleProjectSave: mockHandleProjectSave,
            handleProjectImport: mockHandleProjectImport,
            handleTaskSave: mockHandleTaskSave,
            handleDeleteProject: mockHandleDeleteProject,
            handleDeleteTask: mockHandleDeleteTask,
        });

        render(
            <MemoryRouter initialEntries={['/projects/1001?from=my-dashboard']}>
                <Routes>
                    <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByRole('heading', { level: 1, name: 'Planner launch board' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Board' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Board' }));

        expect(await screen.findByText('Draft copy')).toBeInTheDocument();
        expect(screen.getByText('Backlog')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(dragEndHandler).not.toBeNull();

        await act(async () => {
            await dragEndHandler?.({
                active: {
                    data: {
                        current: {
                            task: plannerProject.tasks[0],
                        },
                    },
                },
                over: { id: 'Done' },
            });
        });

        await waitFor(() => {
            expect(mockHandleTaskSave).toHaveBeenCalledWith(
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
