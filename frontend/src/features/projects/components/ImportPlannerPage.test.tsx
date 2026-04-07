import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportPlannerPage } from './ImportPlannerPage';
import { ParsedPlannerProject } from '../utils/plannerParser';

const { mockNavigate, mockHandlePlannerImport, mockParsePlannerWorkbook } = vi.hoisted(() => ({
    mockNavigate: vi.fn(),
    mockHandlePlannerImport: vi.fn(),
    mockParsePlannerWorkbook: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../../auth/context/CurrentUserProvider', () => ({
    useCurrentUser: () => ({
        currentUserName: 'Workspace User',
        isLoading: false,
    }),
}));

vi.mock('../../settings/theme/ThemeProvider', () => ({
    useThemeSettings: () => ({
        isLoading: false,
    }),
}));

vi.mock('../hooks/useProjectCreate', () => ({
    useProjectCreate: () => ({
        error: null,
        isSaving: false,
        handlePlannerImport: mockHandlePlannerImport,
    }),
}));

vi.mock('../utils/plannerParser', async () => {
    const actual = await vi.importActual<typeof import('../utils/plannerParser')>('../utils/plannerParser');
    return {
        ...actual,
        parsePlannerWorkbook: mockParsePlannerWorkbook,
    };
});

const parsedPlannerProject: ParsedPlannerProject = {
    ProjectName: 'planner-export',
    ProjectManager: 'Workspace User',
    SourceFileName: 'planner-export.xlsx',
    ImportedBy: 'Workspace User',
    Start: '2026-04-10',
    Finish: '2026-04-12',
    Status: 'Not Started',
    Priority: 'Medium',
    Notes: 'Imported from Planner.',
    PlannerImportMetadata: {
        source: 'planner',
        importedAt: '2026-04-07T10:00:00.000Z',
        bucketCount: 1,
        labelNames: ['Blue', 'Red'],
    },
    tasks: [
        {
            TaskName: 'Draft launch plan',
            BucketName: 'Backlog',
            ResourceNames: 'Workspace User',
            Start: '2026-04-10',
            Finish: '2026-04-12',
            PercentComplete: 50,
            Status: 'In Progress',
            Priority: 'Medium',
            Notes: '',
            Labels: ['Blue', 'Red'],
            ChecklistItems: [],
            CompletedChecklistItems: [],
        },
    ],
};

describe('ImportPlannerPage', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('previews and imports a Planner workbook', async () => {
        const user = userEvent.setup();
        const workbookFile = new File(['planner workbook'], 'planner-export.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        mockParsePlannerWorkbook.mockResolvedValue(parsedPlannerProject);
        mockHandlePlannerImport.mockResolvedValue({
            ProjectUID: 1201,
            ProjectName: 'planner-export',
            ProjectManager: 'Workspace User',
            CreatedDate: '2026-04-07',
            CalendarName: 'Standard',
            Start: '2026-04-10',
            Finish: '2026-04-12',
            DurationDays: 2,
            PercentComplete: 50,
            Status: 'In Progress',
            Priority: 'Medium',
            IsOverdue: false,
            Notes: 'Imported from Planner.',
            SourceFileName: 'planner-export.xlsx',
            PlannerImportMetadata: parsedPlannerProject.PlannerImportMetadata,
            tasks: [
                {
                    TaskUID: 5001,
                    ProjectUID: 1201,
                    TaskName: 'Draft launch plan',
                    OutlineLevel: 1,
                    OutlineNumber: '1',
                    WBS: '1',
                    IsSummary: false,
                    Predecessors: '',
                    ResourceNames: 'Workspace User',
                    Start: '2026-04-10',
                    Finish: '2026-04-12',
                    DurationDays: 2,
                    PercentComplete: 50,
                    Status: 'In Progress',
                    IsMilestone: false,
                    IsOverdue: false,
                    Notes: '',
                    BucketName: 'Backlog',
                    Labels: ['Blue', 'Red'],
                    ChecklistItems: [],
                    CompletedChecklistItems: [],
                    ChecklistProgress: {
                        completedItems: 0,
                        totalItems: 0,
                        percentComplete: 0,
                    },
                },
            ],
        });

        const { container } = render(<ImportPlannerPage />);
        const fileInput = container.querySelector('input[type="file"]');

        expect(fileInput).not.toBeNull();

        await user.upload(fileInput as HTMLInputElement, workbookFile);
        await user.click(screen.getByRole('button', { name: 'Preview Workbook' }));

        await waitFor(() => {
            expect(mockParsePlannerWorkbook).toHaveBeenCalledWith(workbookFile, 'Workspace User');
        });

        expect(await screen.findByText('Draft launch plan')).toBeInTheDocument();
        expect(screen.getByText('Backlog')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Workspace User')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Import Planner Project' }));

        await waitFor(() => {
            expect(mockHandlePlannerImport).toHaveBeenCalledWith(parsedPlannerProject);
        });

        expect(mockNavigate).toHaveBeenCalledWith('/projects/1201?from=my-dashboard', {
            state: {
                flashMessage: 'Imported "planner-export.xlsx" successfully and created 1 Planner task.',
            },
        });
    });
});
