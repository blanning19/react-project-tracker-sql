import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProjectSummaryTable } from './ProjectSummaryTable';
import { ProjectRecord } from '../../../shared/types/models';

const sampleProject: ProjectRecord = {
    ProjectUID: 1001,
    ProjectName: 'Website refresh',
    ProjectManager: 'Ava Patel',
    CreatedDate: '2026-03-01',
    CalendarName: 'Standard',
    Start: '2026-03-01',
    Finish: '2026-03-20',
    DurationDays: 19,
    PercentComplete: 40,
    Status: 'In Progress',
    Priority: 'High',
    IsOverdue: false,
    Notes: '',
    SourceFileName: 'manual',
    PlannerImportMetadata: null,
    tasks: [
        {
            TaskUID: 5001,
            ProjectUID: 1001,
            TaskName: 'Launch milestone',
            OutlineLevel: 1,
            OutlineNumber: '1',
            WBS: '1',
            IsSummary: false,
            Predecessors: '',
            ResourceNames: 'Ava Patel',
            Start: '2026-03-02',
            Finish: '2026-03-05',
            DurationDays: 3,
            PercentComplete: 100,
            Status: 'Completed',
            IsMilestone: true,
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
};

describe('ProjectSummaryTable', () => {
    it('renders project data and fires sort callbacks from clickable headers', async () => {
        const user = userEvent.setup();
        const onSort = vi.fn();

        render(
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <ProjectSummaryTable
                    projects={[sampleProject]}
                    title="All Projects"
                    subtitle="Showing one project."
                    sortField="Finish"
                    sortDirection="desc"
                    onSort={onSort}
                    actionLabel="Open Project"
                    actionHref={(project) => `/projects/${project.ProjectUID}`}
                />
            </MemoryRouter>,
        );

        expect(screen.getByText('Website refresh')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open Project' })).toHaveAttribute('href', '/projects/1001');
        expect(screen.getByText('Manual')).toBeInTheDocument();
        expect(screen.getByText('1/1')).toBeInTheDocument();
        expect(screen.getByText('100% complete')).toBeInTheDocument();
        expect(screen.getByText('40%')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Project' }));
        expect(onSort).toHaveBeenCalledWith('ProjectName');
    });
});
