import { useState } from 'react';
import { Alert, Button, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { BACK_TO_MY_DASHBOARD_LABEL } from '../../../shared/constants/projectUi';
import { useCurrentUser } from '../../auth/context/CurrentUserProvider';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { useProjectCreate } from '../hooks/useProjectCreate';
import { ParsedPlannerProject, parsePlannerWorkbook } from '../utils/plannerParser';

export function ImportPlannerPage() {
    const navigate = useNavigate();
    const { isLoading: isSettingsLoading } = useThemeSettings();
    const { currentUserName, isLoading: isCurrentUserLoading } = useCurrentUser();
    const { error, isSaving, handlePlannerImport } = useProjectCreate(currentUserName);
    const [plannerFile, setPlannerFile] = useState<File | null>(null);
    const [parsedProject, setParsedProject] = useState<ParsedPlannerProject | null>(null);
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const [previewError, setPreviewError] = useState<string | null>(null);

    function appendDebugLog(message: string) {
        setDebugLog((currentLog) => [...currentLog, `${new Date().toLocaleTimeString()}: ${message}`]);
    }

    async function handlePreview() {
        if (!plannerFile) {
            return;
        }

        setPreviewError(null);
        setParsedProject(null);
        appendDebugLog(`Parsing workbook ${plannerFile.name}.`);

        try {
            const parsedWorkbook = await parsePlannerWorkbook(plannerFile, currentUserName);
            appendDebugLog(
                `Parsed ${parsedWorkbook.tasks.length} task(s) across ${parsedWorkbook.PlannerImportMetadata.bucketCount} bucket(s).`,
            );
            setParsedProject(parsedWorkbook);
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Unable to parse the Planner workbook.';
            appendDebugLog(`Preview failed: ${message}`);
            setPreviewError(message);
        }
    }

    async function handleImport() {
        if (!parsedProject) {
            return;
        }

        appendDebugLog(`Sending ${parsedProject.tasks.length} task(s) to the API for import.`);

        try {
            const importedProject = await handlePlannerImport(parsedProject);
            appendDebugLog(`Import succeeded and created project ${importedProject.ProjectUID}.`);
            navigate(`/projects/${importedProject.ProjectUID}?from=my-dashboard`, {
                state: {
                    flashMessage: `Imported "${parsedProject.SourceFileName}" successfully and created ${importedProject.tasks.length} Planner task${importedProject.tasks.length === 1 ? '' : 's'}.`,
                },
            });
        } catch (caughtError) {
            const message = caughtError instanceof Error ? caughtError.message : 'Unable to import the Planner workbook.';
            appendDebugLog(`Import failed: ${message}`);
        }
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
                        <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
                            <div>
                                <p className="text-uppercase small mb-2 hero-kicker">Planner Import</p>
                                <h1 className="display-6 fw-semibold mb-2">Import a Microsoft Planner workbook.</h1>
                                <p className="mb-0 text-body-secondary">
                                    Upload the Excel export, preview the parsed buckets and labels, then create a board-ready project.
                                </p>
                            </div>
                            <Button variant="outline-secondary" onClick={() => navigate('/my-dashboard')}>
                                {BACK_TO_MY_DASHBOARD_LABEL}
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {previewError ? <Alert variant="warning">{previewError}</Alert> : null}
            {error ? <Alert variant="danger">{error}</Alert> : null}

            <Row className="g-4">
                <Col xl={8}>
                    <Card className="shadow-sm border-0 dashboard-panel">
                        <Card.Body>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Planner workbook</Form.Label>
                                <Form.Control
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(event) => {
                                        setPreviewError(null);
                                        setParsedProject(null);
                                        setPlannerFile((event.currentTarget as HTMLInputElement).files?.[0] ?? null);
                                    }}
                                />
                                <Form.Text className="text-body-secondary">
                                    Supported formats: `.xlsx` or `.xls` exported from Microsoft Planner.
                                </Form.Text>
                            </Form.Group>

                            <div className="d-flex gap-2 mb-4">
                                <Button type="button" variant="outline-primary" onClick={() => void handlePreview()} disabled={!plannerFile}>
                                    Preview Workbook
                                </Button>
                                <Button type="button" onClick={() => void handleImport()} disabled={!parsedProject || isSaving}>
                                    {isSaving ? 'Importing...' : 'Import Planner Project'}
                                </Button>
                            </div>

                            {parsedProject ? (
                                <>
                                    <div className="d-flex flex-wrap gap-3 mb-3">
                                        <div><strong>Project:</strong> {parsedProject.ProjectName}</div>
                                        <div><strong>Tasks:</strong> {parsedProject.tasks.length}</div>
                                        <div><strong>Buckets:</strong> {parsedProject.PlannerImportMetadata.bucketCount}</div>
                                        <div><strong>Labels:</strong> {parsedProject.PlannerImportMetadata.labelNames.length}</div>
                                    </div>

                                    <div className="table-responsive">
                                        <Table hover className="align-middle mb-0 task-table">
                                            <thead>
                                                <tr>
                                                    <th>Task</th>
                                                    <th>Bucket</th>
                                                    <th>Status</th>
                                                    <th>Assigned</th>
                                                    <th>Labels</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedProject.tasks.slice(0, 12).map((task) => (
                                                    <tr key={`${task.BucketName}-${task.TaskName}`}>
                                                        <td>{task.TaskName}</td>
                                                        <td>{task.BucketName}</td>
                                                        <td>{task.Status}</td>
                                                        <td>{task.ResourceNames || 'Unassigned'}</td>
                                                        <td>{task.Labels.join(', ') || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </>
                            ) : (
                                <Alert variant="secondary" className="mb-0">
                                    Select a workbook and preview it to validate the parsed Planner data.
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col xl={4}>
                    <Card className="shadow-sm border-0 dashboard-panel h-100">
                        <Card.Body>
                            <p className="text-uppercase small text-body-secondary mb-1">Debug Console</p>
                            <h2 className="h5 mb-3">Import activity</h2>
                            {debugLog.length === 0 ? (
                                <p className="mb-0 text-body-secondary">Parser and import events will appear here.</p>
                            ) : (
                                <div className="small d-flex flex-column gap-2">
                                    {debugLog.map((line) => (
                                        <div key={line}>{line}</div>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}
