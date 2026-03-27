import { expect, test } from '@playwright/test';

test('home page renders project data with mocked API responses', async ({ page }) => {
    await page.route('http://127.0.0.1:8000/api/settings/demo-user', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                userId: 'demo-user',
                currentUserName: 'Ava Patel',
                theme: 'light',
                dashboardSortField: 'Finish',
                dashboardSortDirection: 'asc',
            }),
        });
    });

    await page.route('http://127.0.0.1:8000/api/projects', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                {
                    ProjectUID: 1001,
                    ProjectName: 'Website refresh',
                    ProjectManager: 'Ava Patel',
                    CreatedDate: '2026-03-01',
                    CalendarName: '',
                    Start: '2026-03-01',
                    Finish: '2026-03-20',
                    DurationDays: 19,
                    PercentComplete: 50,
                    Status: 'In Progress',
                    Priority: 'High',
                    IsOverdue: false,
                    Notes: '',
                    SourceFileName: 'manual',
                    tasks: [],
                },
            ]),
        });
    });

    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'All projects' })).toBeVisible();
    await expect(page.getByText('Website refresh')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create or Import Project' })).toBeVisible();
});
