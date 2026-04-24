import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BACK_TO_MY_DASHBOARD_LABEL } from '../../../shared/constants/projectUi';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { useCurrentUser } from '../../auth/context/CurrentUserProvider';
import { ProjectForm } from './ProjectForm';
import { useProjectCreate } from '../hooks/useProjectCreate';

export function ProjectCreatePage() {
    const navigate = useNavigate();
    const { isLoading: isSettingsLoading } = useThemeSettings();
    const { currentUserName, isLoading: isCurrentUserLoading } = useCurrentUser();
    const [xmlImportFile, setXmlImportFile] = useState<File | null>(null);
    // This page only creates or imports a single project, so it uses a focused
    // mutation hook instead of loading the entire workspace project list first.
    const { isSaving, error, handleProjectImport, handleProjectSave } = useProjectCreate(currentUserName);

    async function handleXmlImport() {
        if (!xmlImportFile) {
            return;
        }

        const importedProject = await handleProjectImport(xmlImportFile);
        navigate(`/projects/${importedProject.ProjectUID}?from=my-dashboard`, {
            state: {
                flashMessage: `Imported "${xmlImportFile.name}" successfully and created ${importedProject.tasks.length} task${importedProject.tasks.length === 1 ? '' : 's'}.`,
            },
        });
    }

    if (isSettingsLoading || isCurrentUserLoading) {
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
                                <h1 className="display-6 fw-semibold mb-2">Choose how you want to start.</h1>
                                <p className="mb-0 text-body-secondary">
                                    This page is the main entry point for new work. Import an existing schedule from Microsoft Project or Planner, or create a project manually from scratch.
                                </p>
                            </div>
                            <Button variant="outline-secondary" onClick={() => navigate('/my-dashboard')}>
                                {BACK_TO_MY_DASHBOARD_LABEL}
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
                <Col xl={6}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100 project-entry-card">
                        <Card.Body className="d-flex flex-column">
                            <p className="text-uppercase small text-body-secondary mb-2">Option 1</p>
                            <h2 className="h5 mb-2">Import an Existing Project</h2>
                            <p className="text-body-secondary mb-3">
                                Bring in an existing plan from Microsoft Project XML or continue to the dedicated Planner workbook flow.
                            </p>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">XML file</Form.Label>
                                <Form.Control
                                    type="file"
                                    accept=".xml"
                                    onChange={(event) =>
                                        setXmlImportFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null)
                                    }
                                />
                                <Form.Text className="text-body-secondary">
                                    Supported format: `.xml` exported from Microsoft Project.
                                </Form.Text>
                            </Form.Group>
                            <div className="small text-body-secondary mb-3 project-entry-file">
                                {xmlImportFile ? (
                                    <>
                                        Selected file: <strong>{xmlImportFile.name}</strong>
                                    </>
                                ) : (
                                    'No XML file selected yet.'
                                )}
                            </div>
                            <div className="project-entry-note mb-3">
                                Use XML import for Microsoft Project schedules. Use Planner import when you want preview, bucket, and label validation before creating the project.
                            </div>
                            <div className="d-flex gap-2 flex-wrap mt-auto">
                                <Button onClick={() => void handleXmlImport()} disabled={!xmlImportFile || isSaving}>
                                    {isSaving ? 'Importing...' : 'Import MS Project'}
                                </Button>
                                <Button variant="outline-primary" onClick={() => navigate('/import-planner')}>
                                    Open Planner Import
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={6}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100 project-entry-card">
                        <Card.Body className="d-flex flex-column">
                            <p className="text-uppercase small text-body-secondary mb-2">Option 2</p>
                            <h2 className="h5 mb-2">Create Manually</h2>
                            <p className="text-body-secondary mb-3">
                                Start with a blank project and fill in the core schedule details below. This works best for lightweight setup or brand-new initiatives.
                            </p>
                            <div className="project-entry-note mb-3">
                                After creation, you can add tasks, review the timeline, and manage work directly from the project detail page.
                            </div>
                            <div className="mt-auto">
                                <Button
                                    variant="outline-secondary"
                                    onClick={() =>
                                        document.getElementById('manual-project-form')?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'start',
                                        })
                                    }
                                >
                                    Go to Manual Form
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-4 mt-1">
                <Col lg={12}>
                    <div id="manual-project-form" className="project-form-anchor" />
                    <ProjectForm
                        project={null}
                        onSave={async (payload) => {
                            const savedProject = await handleProjectSave(payload);
                            navigate(`/projects/${savedProject.ProjectUID}?from=my-dashboard`, {
                                state: {
                                    flashMessage: `Project "${savedProject.ProjectName}" was created successfully.`,
                                },
                            });
                            return savedProject;
                        }}
                        onClear={() => undefined}
                        showImportSection={false}
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
