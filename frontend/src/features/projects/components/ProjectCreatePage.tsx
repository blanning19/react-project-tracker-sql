import { Alert, Button, Col, Container, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useProjectData } from '../../dashboard/hooks/useProjectData';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { ProjectForm } from './ProjectForm';

export function ProjectCreatePage() {
    const navigate = useNavigate();
    const { settings, isLoading: isSettingsLoading } = useThemeSettings();
    const { isLoading, isSaving, error, handleProjectImport, handleProjectSave } = useProjectData(settings);

    if (isLoading || isSettingsLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    return (
        <Container fluid="xl" className="pt-3 pt-lg-4 pb-4 pb-lg-5">
            <Row className="g-4 align-items-stretch mb-4">
                <Col xl={12}>
                    <div className="hero-panel rounded-4 shadow-sm h-100 p-4 p-lg-5">
                        <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-start">
                            <div>
                                <p className="text-uppercase small mb-2 hero-kicker">Create Project</p>
                                <h1 className="display-6 fw-semibold mb-2">Start a project manually or import one.</h1>
                                <p className="mb-0 text-body-secondary">
                                    Use the form for manual entry or upload a Microsoft Project XML export to create the
                                    project and tasks in one step.
                                </p>
                            </div>
                            <Button variant="outline-secondary" onClick={() => navigate('/my-dashboard')}>
                                Back to My Dashboard
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {error ? (
                <Alert variant="danger" className="mt-4">
                    {error}
                </Alert>
            ) : null}

            <Row className="g-4">
                <Col lg={12}>
                    <ProjectForm
                        project={null}
                        onSave={async (payload) => {
                            await handleProjectSave(payload);
                            navigate(`/projects/${payload.ProjectUID}?from=my-dashboard`, {
                                state: {
                                    flashMessage: `Project "${payload.ProjectName}" was created successfully.`,
                                },
                            });
                        }}
                        onImport={async (file) => {
                            const importedProject = await handleProjectImport(file);
                            navigate(`/projects/${importedProject.ProjectUID}?from=my-dashboard`, {
                                state: {
                                    flashMessage: `Imported "${file.name}" successfully and created ${importedProject.tasks.length} task${importedProject.tasks.length === 1 ? '' : 's'}.`,
                                },
                            });
                        }}
                        onClear={() => undefined}
                        footerActions={
                            <Button
                                variant="outline-secondary"
                                onClick={() => navigate('/my-dashboard')}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                        }
                    />
                </Col>
            </Row>
        </Container>
    );
}
