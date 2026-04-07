import { ProjectRecord } from '../types/models';

export type ProjectType = 'planner' | 'ms-project' | 'manual';

export function getProjectType(project: ProjectRecord): ProjectType {
    if (project.PlannerImportMetadata?.source === 'planner') {
        return 'planner';
    }

    if (project.SourceFileName.toLowerCase().endsWith('.xml') || project.SourceFileName.toLowerCase().endsWith('.mpp')) {
        return 'ms-project';
    }

    return 'manual';
}

export function getProjectTypeLabel(project: ProjectRecord): string {
    const projectType = getProjectType(project);

    if (projectType === 'planner') {
        return 'Planner';
    }

    if (projectType === 'ms-project') {
        return 'MS Project';
    }

    return 'Manual';
}

export function isPlannerProject(project: ProjectRecord): boolean {
    return getProjectType(project) === 'planner';
}

export function projectHasBoardBuckets(project: ProjectRecord): boolean {
    return project.tasks.some((task) => task.BucketName.trim().length > 0);
}
