import { expect, test } from '@playwright/test';

test('admin page shows import history, access controls, environment details, and logs for admins', async ({ page }) => {
    await page.route('http://127.0.0.1:8000/api/settings/demo-user', async (route) => {
        const request = route.request();

        if (request.method() === 'PUT') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: request.postData() ?? '',
            });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                userId: 'demo-user',
                currentUserName: 'Brad Lanning',
                theme: 'light',
                dashboardSortField: 'Finish',
                dashboardSortDirection: 'asc',
            }),
        });
    });

    await page.route(
        /http:\/\/127\.0\.0\.1:8000\/api\/admin\/access\/me\?user_name=Brad(\+|%20)Lanning/,
        async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    userName: 'Brad Lanning',
                    role: 'Admin',
                    canViewAdmin: true,
                    canViewLogs: true,
                    notes: 'Primary workspace admin.',
                }),
            });
        },
    );

    await page.route(
        /http:\/\/127\.0\.0\.1:8000\/api\/admin\/environment\?user_name=Brad(\+|%20)Lanning/,
        async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    appVersion: '0.1.0',
                    adminUserName: 'Brad Lanning',
                    logFilePath: 'logs/project_tracker_api.log',
                    corsOrigins: ['http://127.0.0.1:5173'],
                    databaseBackend: 'postgresql+psycopg',
                    databaseHost: 'localhost',
                    databaseName: 'project_tracker',
                    swaggerDocsUrl: 'http://127.0.0.1:8000/docs',
                    openapiJsonUrl: 'http://127.0.0.1:8000/openapi.json',
                    healthUrl: 'http://127.0.0.1:8000/health',
                }),
            });
        },
    );

    await page.route(
        /http:\/\/127\.0\.0\.1:8000\/api\/admin\/import-events\?user_name=Brad(\+|%20)Lanning/,
        async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        importEventId: 3,
                        createdAt: '2026-03-27T16:00:00Z',
                        correlationId: 'success-123',
                        sourceFileName: 'advanced-product-launch.xml',
                        importedBy: 'Brad Lanning',
                        status: 'Succeeded',
                        projectUid: 1201,
                        projectName: 'Advanced Product Launch',
                        taskCount: 8,
                        message: 'Project XML imported successfully.',
                        failureReason: '',
                        technicalDetails: '',
                    },
                    {
                        importEventId: 2,
                        createdAt: '2026-03-27T15:30:00Z',
                        correlationId: 'failure-456',
                        sourceFileName: 'broken-upload.xml',
                        importedBy: 'Brad Lanning',
                        status: 'Failed',
                        projectUid: null,
                        projectName: '',
                        taskCount: 0,
                        message: 'The uploaded file is empty.',
                        failureReason: 'The uploaded XML file was empty.',
                        technicalDetails: 'No bytes were received from the uploaded file.',
                    },
                ]),
            });
        },
    );

    await page.route(/http:\/\/127\.0\.0\.1:8000\/api\/admin\/access\?user_name=Brad(\+|%20)Lanning/, async (route) => {
        const request = route.request();
        if (request.method() === 'PUT') {
            const body = request.postDataJSON();
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    userName: 'Mateo Gomez',
                    role: body.role,
                    canViewAdmin: body.canViewAdmin,
                    canViewLogs: body.canViewLogs,
                    notes: body.notes,
                }),
            });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                {
                    userName: 'Brad Lanning',
                    role: 'Admin',
                    canViewAdmin: true,
                    canViewLogs: true,
                    notes: 'Primary workspace admin.',
                },
                {
                    userName: 'Mateo Gomez',
                    role: 'Viewer',
                    canViewAdmin: false,
                    canViewLogs: false,
                    notes: '',
                },
            ]),
        });
    });

    await page.route(
        /http:\/\/127\.0\.0\.1:8000\/api\/admin\/access\/Mateo%20Gomez\?user_name=Brad(\+|%20)Lanning/,
        async (route) => {
            const request = route.request();
            const body = request.postDataJSON();

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    userName: 'Mateo Gomez',
                    role: body.role,
                    canViewAdmin: body.canViewAdmin,
                    canViewLogs: body.canViewLogs,
                    notes: body.notes,
                }),
            });
        },
    );

    await page.route(
        /http:\/\/127\.0\.0\.1:8000\/api\/logs\/current\?user_name=Brad(\+|%20)Lanning.*/,
        async (route) => {
            const url = route.request().url();
            const isContextRequest = url.includes('around_timestamp=');
            const isCorrelationRequest = url.includes('correlation_id=failure-456');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    filePath: 'logs/project_tracker_api.log',
                    lines: [
                        {
                            lineNumber: 1,
                            level: 'INFO',
                            timestamp: '2026-03-27T15:28:30',
                            correlationId: null,
                            isContextMatch: false,
                            content: 'Project Tracker API started.',
                        },
                        {
                            lineNumber: 2,
                            level: 'ERROR',
                            timestamp: '2026-03-27T15:30:10',
                            correlationId: isCorrelationRequest ? 'failure-456' : null,
                            isContextMatch: isContextRequest,
                            content: 'Sample error line for admin review.',
                        },
                    ],
                }),
            });
        },
    );

    await page.goto('/admin');

    await expect(page.getByRole('heading', { level: 1, name: 'Workspace administration tools.' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Import history and failure detail' })).toBeVisible();
    await expect(page.getByText('advanced-product-launch.xml')).toBeVisible();
    await expect(page.getByText('Reason: The uploaded XML file was empty.')).toBeVisible();

    await page.getByText('Environment', { exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Runtime configuration summary' })).toBeVisible();
    await expect(page.getByText('postgresql+psycopg on localhost')).toBeVisible();

    await page.getByText('Access', { exact: true }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'User visibility and role controls' })).toBeVisible();
    await page.getByLabel('Toggle admin visibility for Mateo Gomez').click();
    await page.getByRole('button', { name: 'Save' }).nth(1).click();
    await expect(page.getByRole('combobox').nth(1)).toHaveValue('Viewer');
    await expect(page.getByLabel('Toggle admin visibility for Mateo Gomez')).toBeChecked();

    await page.getByText('Imports', { exact: true }).click();
    await page.getByRole('button', { name: 'View related log context' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Current backend log file' })).toBeVisible();
    await expect(page.getByText('Sample error line for admin review.')).toBeVisible();
});
