import * as XLSX from 'xlsx';
import { parsePlannerWorkbook } from './plannerParser';

function createWorkbookFile(rows: Array<Array<string | number>>, filename = 'planner-export.xlsx'): File {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    const fileBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new File([fileBuffer], filename, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    Object.defineProperty(file, 'arrayBuffer', {
        value: async () => fileBuffer,
    });

    return file;
}

describe('parsePlannerWorkbook', () => {
    it('parses Planner exports when the header row is not the first row', async () => {
        const file = createWorkbookFile([
            ['Microsoft Planner export'],
            ['Task Name', 'Bucket Name', 'Assigned To', 'Start Date', 'Due Date', 'Labels', 'Progress'],
            ['Draft launch plan', 'Backlog', 'Workspace User', '2026-04-10', '2026-04-12', 'Blue; Red', 'In Progress'],
        ]);

        const parsedProject = await parsePlannerWorkbook(file, 'Workspace User');

        expect(parsedProject.tasks).toHaveLength(1);
        expect(parsedProject.tasks[0]).toMatchObject({
            TaskName: 'Draft launch plan',
            BucketName: 'Backlog',
            ResourceNames: 'Workspace User',
            Labels: ['Blue', 'Red'],
            Status: 'In Progress',
        });
        expect(parsedProject.PlannerImportMetadata.bucketCount).toBe(1);
    });

    it('rejects invalid task dates instead of silently defaulting them', async () => {
        const file = createWorkbookFile([
            ['Task Name', 'Bucket Name', 'Assigned To', 'Start Date', 'Due Date', 'Labels', 'Progress'],
            ['Draft launch plan', 'Backlog', 'Workspace User', 'not-a-date', '2026-04-12', 'Blue; Red', 'In Progress'],
        ]);

        await expect(parsePlannerWorkbook(file, 'Workspace User')).rejects.toThrow(
            'Task "Draft launch plan" has an invalid start date: "not-a-date".',
        );
    });
});
