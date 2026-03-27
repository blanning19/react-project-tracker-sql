import { expect, test } from '@playwright/test';

test('create project page shows manual and XML import options with mocked data', async ({ page }) => {
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

    await page.route('http://127.0.0.1:8000/api/managers', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                { managerId: 1, displayName: 'Ava Patel' },
                { managerId: 2, displayName: 'Jordan Lee' },
            ]),
        });
    });
    await page.route('http://127.0.0.1:8000/api/projects', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
        });
    });

    await page.goto('/projects/new');

    await expect(
        page.getByRole('heading', { level: 1, name: 'Start a project manually or import one.' }),
    ).toBeVisible();
    await expect(
        page.getByText('Upload a Microsoft Project XML export to create the project, tasks, managers,'),
    ).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.locator('select').first()).toContainText('Select manager');
});
