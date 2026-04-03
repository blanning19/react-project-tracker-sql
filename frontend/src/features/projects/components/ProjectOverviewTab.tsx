import { ReactNode } from 'react';
import { Badge, Button, Card, Col, Row } from 'react-bootstrap';
import { ProjectPayload, ProjectRecord } from '../../../shared/types/models';
import { formatDate } from '../../../shared/utils/date';
import { ProjectForm } from './ProjectForm';
import { buildPhaseSummaries } from './projectDetailUtils';

interface ProjectOverviewTabProps {
    isOwner: boolean;
    isSaving: boolean;
    modeLabel: string;
    onDeleteProject: () => Promise<void>;
    onProjectSave: (payload: ProjectPayload, projectId?: number) => Promise<ProjectRecord>;
    onSetEditingProject: () => void;
    project: ProjectRecord;
    projectForForm: ProjectRecord | null;
}

export function ProjectOverviewTab({
    isOwner,
    isSaving,
    modeLabel,
    onDeleteProject,
    onProjectSave,
    onSetEditingProject,
    project,
    projectForForm,
}: ProjectOverviewTabProps) {
    const phaseSummaries = buildPhaseSummaries(project.tasks);
    const footerActions: ReactNode | undefined = isOwner ? (
        <Button variant="outline-danger" onClick={() => void onDeleteProject()} disabled={isSaving}>
            Delete Project
        </Button>
    ) : undefined;

    return (
        <>
            <Card className="shadow-sm border-0 dashboard-panel mb-4 project-mode-section">
                <Card.Body className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
                    <div>
                        <p className="text-uppercase small text-body-secondary mb-1">Overview Panel</p>
                        <h2 className="h5 mb-1">{isOwner ? 'Project form is editable.' : 'Project form is locked.'}</h2>
                        <p className="mb-0 text-body-secondary">
                            {isOwner
                                ? 'This owner-facing form stays live so project details can be updated without leaving the overview tab.'
                                : 'This section stays in read-only form layout so non-owners can review the same details without making accidental changes.'}
                        </p>
                    </div>
                    <Badge bg={isOwner ? 'success' : 'secondary'} className="project-mode-pill align-self-start align-self-lg-center">
                        {modeLabel}
                    </Badge>
                </Card.Body>
            </Card>

            <Row className="g-3 mb-4">
                <Col md={6} xl={3}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100">
                        <Card.Body>
                            <p className="text-uppercase small text-body-secondary mb-1">Start</p>
                            <div className="fw-semibold">{formatDate(project.Start)}</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} xl={3}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100">
                        <Card.Body>
                            <p className="text-uppercase small text-body-secondary mb-1">Finish</p>
                            <div className="fw-semibold">{formatDate(project.Finish)}</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} xl={3}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100">
                        <Card.Body>
                            <p className="text-uppercase small text-body-secondary mb-1">Duration</p>
                            <div className="fw-semibold">{project.DurationDays} days</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6} xl={3}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100">
                        <Card.Body>
                            <p className="text-uppercase small text-body-secondary mb-1">Complete</p>
                            <div className="fw-semibold">{project.PercentComplete}%</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {phaseSummaries.length > 0 ? (
                <Card className="shadow-sm border-0 dashboard-panel mb-4">
                    <Card.Body>
                        <p className="text-uppercase small text-body-secondary mb-1">Phases</p>
                        <h2 className="h5 mb-3">Imported summary phases</h2>
                        <Row className="g-3">
                            {phaseSummaries.map(({ phase, taskCount, milestoneCount }) => (
                                <Col lg={4} key={phase.TaskUID}>
                                    <Card className="border-0 shadow-sm h-100">
                                        <Card.Body>
                                            <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                                                {phase.WBS ? <Badge bg="secondary">{phase.WBS}</Badge> : null}
                                                <Badge bg="warning" text="dark">
                                                    Phase
                                                </Badge>
                                            </div>
                                            <div className="fw-semibold mb-1">{phase.TaskName}</div>
                                            <div className="small text-body-secondary">
                                                {taskCount} task{taskCount === 1 ? '' : 's'} | {milestoneCount}{' '}
                                                milestone
                                                {milestoneCount === 1 ? '' : 's'}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </Card.Body>
                </Card>
            ) : null}

            <Row className="g-4">
                <Col lg={12}>
                    <ProjectForm
                        project={projectForForm}
                        onSave={onProjectSave}
                        onClear={onSetEditingProject}
                        showCreateAction={false}
                        readOnly={!isOwner}
                        footerActions={footerActions}
                    />
                </Col>
            </Row>
        </>
    );
}
