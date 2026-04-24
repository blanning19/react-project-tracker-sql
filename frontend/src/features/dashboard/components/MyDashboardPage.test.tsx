import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { MyDashboardPage } from './MyDashboardPage';
import { ProjectRecord } from '../../../shared/types/models';

const { mockUseProjectData, mockGetProjectAccess, mockCanEditTask } = vi.hoisted(() => ({
    mockUseProjectData: vi.fn(),
    mockGetProjectAccess: vi.fn(),
    mockCanEditTask: vi.fn(),
}));

vi.mock('../../settings/theme/ThemeProvider', () => ({
    useThemeSettings: () => ({
        preferences: {
            theme: 'light',
            dashboardSortField: 'Finish',
            dashboardSortDirection: 'asc',
        },
        setDashboardSort: vi.fn(),
        isLoading: false,
    }),
}));

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

vi.mock('../hooks/useProjectData', () => ({
    useProjectData: mockUseProjectData,
}));

vi.mock('../../../shared/permissions/workspacePermissions', () => ({
    buildPermissionContext: vi.fn(() => ({
        userName: 'Ava Patel',
        role: 'Admin',
    })),
    getProjectAccess: mockGetProjectAccess,
    canEditTask: mockCanEditTask,
}));

function buildProject(projectUid: number, overrides: Partial<ProjectRecord>): ProjectRecord {
    return {
        ProjectUID: projectUid,
        ProjectName: `Project ${projectUid}`,
        ProjectManager: 'Ava Patel',
        CreatedDate: '2026-04-01',
        CalendarName: 'Standard',
        Start: '2026-04-01',
        Finish: '2026-04-20',
        DurationDays: 19,
        PercentComplete: 60,
        Status: 'In Progress',
        Priority: 'Medium',
        IsOverdue: false,
        Notes: '',
        SourceFileName: '',
        PlannerImportMetadata: null,
        tasks: [
            {
                TaskUID: projectUid * 10,
                ProjectUID: projectUid,
                TaskName: `Task ${projectUid}`,
                OutlineLevel: 1,
                OutlineNumber: '1',
                WBS: '1',
                IsSummary: false,
                Predecessors: '',
                ResourceNames: 'Ava Patel',
                Start: '2026-04-01',
                Finish: '2026-04-04',
                DurationDays: 3,
                PercentComplete: 20,
                Status: 'In Progress',
                IsMilestone: false,
                IsOverdue: false,
                Notes: '',
                BucketName: '',
                Labels: [],
                ChecklistItems: [],
                CompletedChecklistItems: [],
                ChecklistProgress: {
                    completedItems: 0,
                    totalItems: 0,
                    percentComplete: 0,
                },
            },
        ],
        ...overrides,
    };
}

describe('MyDashboardPage', () => {
    beforeEach(() => {
        mockUseProjectData.mockReturnValue({
            projects: [
                buildProject(1001, { ProjectName: 'Alpha rollout', Status: 'In Progress' }),
                buildProject(1002, { ProjectName: 'Bravo closeout', Status: 'Completed', PercentComplete: 100 }),
            ],
            isLoading: false,
            error: null,
        });
        mockGetProjectAccess.mockImplementation((project: ProjectRecord) => ({
            canEdit: true,
            hasAssignedTask: true,
            editableOpenTaskCount: project.Status === 'Completed' ? 0 : 1,
            isOwner: true,
        }));
        mockCanEditTask.mockReturnValue(true);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('filters visible projects by search term and status while keeping progress cues visible', async () => {
        const user = userEvent.setup();

        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <MyDashboardPage />
            </MemoryRouter>,
        );

        expect(screen.getAllByText('Alpha rollout').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Bravo closeout').length).toBeGreaterThan(0);
        expect(screen.getAllByText('60%').length).toBeGreaterThan(0);

        await user.type(screen.getByPlaceholderText('Search by project name, manager, or status'), 'Alpha');
        expect(screen.getAllByText('Alpha rollout').length).toBeGreaterThan(0);
        expect(screen.queryByText('Bravo closeout')).not.toBeInTheDocument();

        await user.clear(screen.getByPlaceholderText('Search by project name, manager, or status'));
        await user.selectOptions(screen.getAllByRole('combobox')[2], 'Completed');
        expect(screen.getAllByText('Bravo closeout').length).toBeGreaterThan(0);
        expect(screen.queryByText('Alpha rollout')).not.toBeInTheDocument();
    });
});
