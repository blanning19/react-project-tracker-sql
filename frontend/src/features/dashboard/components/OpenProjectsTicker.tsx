import { ProjectRecord } from '../../../shared/types/models';
import { getStatusClass } from '../../../shared/utils/status';

interface OpenProjectsTickerProps {
    projects: ProjectRecord[];
}

export function OpenProjectsTicker({ projects }: OpenProjectsTickerProps) {
    const openProjects = projects.filter((project) => project.Status !== 'Completed');

    return (
        <div className="ticker-shell rounded-4 shadow-sm border-0">
            <div className="ticker-label">Open Project Status</div>
            <div className="ticker-track">
                <div className="ticker-move">
                    {openProjects.map((project) => (
                        <div
                            key={project.ProjectUID}
                            className={`ticker-pill text-bg-${getStatusClass(project.Status, project.IsOverdue)}`}
                        >
                            <span className="fw-semibold">{project.ProjectName}</span>
                            <span>{project.Status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
