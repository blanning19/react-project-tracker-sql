import * as XLSX from 'xlsx';
import { PlannerImportMetadataRecord } from '../../../shared/types/models';

export interface ParsedPlannerTask {
    TaskName: string;
    BucketName: string;
    ResourceNames: string;
    Start: string;
    Finish: string;
    PercentComplete: number;
    Status: string;
    Priority: string;
    Notes: string;
    Labels: string[];
    ChecklistItems: string[];
    CompletedChecklistItems: string[];
}

export interface ParsedPlannerProject {
    ProjectName: string;
    ProjectManager: string;
    SourceFileName: string;
    ImportedBy: string;
    Start: string;
    Finish: string;
    Status: string;
    Priority: string;
    Notes: string;
    PlannerImportMetadata: PlannerImportMetadataRecord;
    tasks: ParsedPlannerTask[];
}

type PlannerRow = Record<string, string | number | boolean | Date | null | undefined>;
type PlannerSheetRow = Array<string | number | boolean | Date | null | undefined>;

const HEADER_SCAN_LIMIT = 25;

function normalizeHeader(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchesAnyHeader(normalizedValues: string[], ...candidateHeaders: string[]): boolean {
    return candidateHeaders.some((candidateHeader) => normalizedValues.includes(candidateHeader));
}

function findHeaderRowIndex(rows: PlannerSheetRow[]): number {
    for (let rowIndex = 0; rowIndex < Math.min(rows.length, HEADER_SCAN_LIMIT); rowIndex += 1) {
        const normalizedValues = rows[rowIndex]
            .map((value) => normalizeHeader(String(value ?? '')))
            .filter(Boolean);

        const hasTaskHeader = matchesAnyHeader(normalizedValues, 'taskname', 'title', 'task');
        const hasSupportingHeader =
            matchesAnyHeader(normalizedValues, 'bucketname', 'bucket') ||
            matchesAnyHeader(normalizedValues, 'assignedto', 'assignees', 'resources') ||
            matchesAnyHeader(normalizedValues, 'startdate', 'start') ||
            matchesAnyHeader(normalizedValues, 'duedate', 'finishdate', 'finish') ||
            matchesAnyHeader(normalizedValues, 'progress', 'status');

        if (hasTaskHeader && hasSupportingHeader) {
            return rowIndex;
        }
    }

    return -1;
}

function rowsToPlannerObjects(rows: PlannerSheetRow[], headerRowIndex: number): PlannerRow[] {
    const headerRow = rows[headerRowIndex] ?? [];
    const normalizedHeaders = headerRow.map((value) => String(value ?? '').trim());

    return rows
        .slice(headerRowIndex + 1)
        .filter((row) => row.some((value) => String(value ?? '').trim().length > 0))
        .map((row) =>
            normalizedHeaders.reduce<PlannerRow>((plannerRow, header, columnIndex) => {
                if (!header) {
                    return plannerRow;
                }

                plannerRow[header] = row[columnIndex];
                return plannerRow;
            }, {}),
        );
}

function rowValue(row: PlannerRow, ...candidateHeaders: string[]): string {
    const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value] as const);
    for (const header of candidateHeaders) {
        const matchedValue = normalizedEntries.find(([normalizedHeader]) => normalizedHeader === header)?.[1];
        if (matchedValue instanceof Date) {
            return matchedValue.toISOString().slice(0, 10);
        }
        if (matchedValue === null || matchedValue === undefined) {
            continue;
        }
        const stringValue = String(matchedValue).trim();
        if (stringValue) {
            return stringValue;
        }
    }
    return '';
}

function splitValues(value: string): string[] {
    return value
        .split(/[,;\n|]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseDateValue(value: string): string {
    if (!value) {
        return new Date().toISOString().slice(0, 10);
    }

    const workbookDate = XLSX.SSF.parse_date_code(Number(value));
    if (!Number.isNaN(Number(value)) && workbookDate) {
        return new Date(Date.UTC(workbookDate.y, workbookDate.m - 1, workbookDate.d)).toISOString().slice(0, 10);
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }

    return parsedDate.toISOString().slice(0, 10);
}

function inferPercentComplete(row: PlannerRow): number {
    const progressValue = rowValue(row, 'percentcomplete', 'complete', 'progress', 'completion');
    const numericValue = Number(progressValue.replace('%', ''));
    if (Number.isFinite(numericValue)) {
        return Math.max(0, Math.min(100, Math.round(numericValue)));
    }

    const status = inferStatus(row).toLowerCase();
    if (status === 'completed') {
        return 100;
    }
    if (status === 'in progress') {
        return 50;
    }
    return 0;
}

function inferStatus(row: PlannerRow): string {
    const progressValue = rowValue(row, 'progress', 'status');
    const normalizedProgress = progressValue.trim().toLowerCase();

    if (normalizedProgress.includes('complete')) {
        return 'Completed';
    }
    if (normalizedProgress.includes('progress') || normalizedProgress.includes('started')) {
        return 'In Progress';
    }
    if (normalizedProgress.includes('block')) {
        return 'Blocked';
    }
    return 'Not Started';
}

function inferPriority(row: PlannerRow): string {
    const priorityValue = rowValue(row, 'priority', 'importance').trim().toLowerCase();
    if (priorityValue === 'urgent' || priorityValue === 'important' || priorityValue === 'high') {
        return 'High';
    }
    if (priorityValue === 'low') {
        return 'Low';
    }
    return 'Medium';
}

function buildPlannerTask(row: PlannerRow): ParsedPlannerTask | null {
    const taskName = rowValue(row, 'taskname', 'title', 'task');
    if (!taskName) {
        return null;
    }

    const checklistItems = splitValues(rowValue(row, 'checklistitems', 'checklist', 'checklistitemtitles'));
    const completedChecklistItems = splitValues(
        rowValue(row, 'completedchecklistitems', 'completedchecklist', 'completedchecklistitemtitles'),
    );

    const start = parseDateValue(rowValue(row, 'startdate', 'start'));
    const finish = parseDateValue(rowValue(row, 'duedate', 'finishdate', 'finish'));

    return {
        TaskName: taskName,
        BucketName: rowValue(row, 'bucketname', 'bucket') || 'Unbucketed',
        ResourceNames: splitValues(rowValue(row, 'assignedto', 'assignees', 'resources')).join(', '),
        Start: start,
        Finish: finish < start ? start : finish,
        PercentComplete: inferPercentComplete(row),
        Status: inferStatus(row),
        Priority: inferPriority(row),
        Notes: rowValue(row, 'notes', 'description'),
        Labels: splitValues(rowValue(row, 'labels', 'label')),
        ChecklistItems: checklistItems,
        CompletedChecklistItems: completedChecklistItems.filter((item) => checklistItems.includes(item) || item),
    };
}

export async function parsePlannerWorkbook(file: File, importedBy: string): Promise<ParsedPlannerProject> {
    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
    if (workbook.SheetNames.length === 0) {
        throw new Error('The workbook does not contain any worksheets.');
    }

    const tasks = workbook.SheetNames.flatMap((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<PlannerSheetRow>(worksheet, {
            header: 1,
            defval: '',
            raw: false,
        });
        const headerRowIndex = findHeaderRowIndex(rows);
        if (headerRowIndex < 0) {
            return [];
        }

        return rowsToPlannerObjects(rows, headerRowIndex)
            .map((row) => buildPlannerTask(row))
            .filter((task): task is ParsedPlannerTask => task !== null);
    });

    if (tasks.length === 0) {
        throw new Error(
            'No Planner tasks were found in the uploaded workbook. Check that the export includes task columns such as Task Name, Bucket, Start Date, or Due Date.',
        );
    }

    const start = tasks.reduce((currentStart, task) => (task.Start < currentStart ? task.Start : currentStart), tasks[0].Start);
    const finish = tasks.reduce(
        (currentFinish, task) => (task.Finish > currentFinish ? task.Finish : currentFinish),
        tasks[0].Finish,
    );
    const uniqueLabels = Array.from(new Set(tasks.flatMap((task) => task.Labels))).sort((left, right) =>
        left.localeCompare(right),
    );
    const bucketNames = Array.from(new Set(tasks.map((task) => task.BucketName))).sort((left, right) =>
        left.localeCompare(right),
    );
    const completedTaskCount = tasks.filter((task) => task.PercentComplete >= 100).length;
    const projectStatus = completedTaskCount === tasks.length ? 'Completed' : completedTaskCount > 0 ? 'In Progress' : 'Not Started';

    return {
        ProjectName: file.name.replace(/\.[^.]+$/, '') || 'Imported Planner Project',
        ProjectManager: importedBy,
        SourceFileName: file.name,
        ImportedBy: importedBy,
        Start: start,
        Finish: finish,
        Status: projectStatus,
        Priority: 'Medium',
        Notes: `Imported from Microsoft Planner workbook "${file.name}".`,
        PlannerImportMetadata: {
            source: 'planner',
            importedAt: new Date().toISOString(),
            bucketCount: bucketNames.length,
            labelNames: uniqueLabels,
        },
        tasks,
    };
}
