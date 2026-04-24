import { Alert, Badge, Card, Col, Row } from 'react-bootstrap';
import { ProjectRecord } from '../../../shared/types/models';
import { formatDate } from '../../../shared/utils/date';
import { buildPhaseSummaries } from './projectDetailUtils';

interface ProjectPhasesTabProps {
    project: ProjectRecord;
}

export function ProjectPhasesTab({ project }: ProjectPhasesTabProps) {
    const phaseSummaries = buildPhaseSummaries(project.tasks);

    if (phaseSummaries.length === 0) {
        return <Alert variant="secondary">No imported summary phases are available for this project.</Alert>;
    }

    return (
        <Card className="shadow-sm border-0 dashboard-panel mb-4">
            <Card.Body>
                <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center mb-3">
                    <div>
                        <p className="text-uppercase small text-body-secondary mb-1">Phases</p>
                        <h2 className="h5 mb-0">Imported summary phases</h2>
                    </div>
                    <Badge bg="secondary">{phaseSummaries.length} phase{phaseSummaries.length === 1 ? '' : 's'}</Badge>
                </div>

                <Row className="g-3">
                    {phaseSummaries.map(({ phase, taskCount, milestoneCount }) => (
                        <Col xl={6} key={phase.TaskUID}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Body>
                                    <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                                        {phase.WBS ? <Badge bg="secondary">{phase.WBS}</Badge> : null}
                                        <Badge bg="warning" text="dark">
                                            Phase
                                        </Badge>
                                        <Badge bg="info">{phase.PercentComplete}% complete</Badge>
                                    </div>
                                    <div className="fw-semibold mb-2">{phase.TaskName}</div>
                                    <Row className="g-2 small text-body-secondary">
                                        <Col sm={6}>
                                            <strong>Start:</strong> {formatDate(phase.Start)}
                                        </Col>
                                        <Col sm={6}>
                                            <strong>Finish:</strong> {formatDate(phase.Finish)}
                                        </Col>
                                        <Col sm={6}>
                                            <strong>Tasks:</strong> {taskCount}
                                        </Col>
                                        <Col sm={6}>
                                            <strong>Milestones:</strong> {milestoneCount}
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Card.Body>
        </Card>
    );
}
