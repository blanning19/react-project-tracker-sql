import { Alert, Button, Card, Col, Row } from 'react-bootstrap';
import { EnvironmentSummaryRecord } from '../../../shared/types/models';

interface EnvironmentTabProps {
    environmentSummary: EnvironmentSummaryRecord | null;
}

export function EnvironmentTab({ environmentSummary }: EnvironmentTabProps) {
    return (
        <Row className="g-4 mb-4">
            <Col xl={6}>
                <Card className="shadow-sm border-0 dashboard-panel h-100">
                    <Card.Body>
                        <p className="text-uppercase small text-body-secondary mb-1">Environment</p>
                        <h2 className="h5 mb-3">Runtime configuration summary</h2>
                        <p className="small text-body-secondary">
                            This section exposes safe runtime details that help admins support the app without opening
                            server config files directly.
                        </p>
                        {environmentSummary ? (
                            <div className="d-grid gap-3">
                                <div className="border rounded-3 p-3">
                                    <div className="small text-body-secondary mb-1">Application Version</div>
                                    <div className="fw-semibold">{environmentSummary.appVersion}</div>
                                </div>
                                <div className="border rounded-3 p-3">
                                    <div className="small text-body-secondary mb-1">Database</div>
                                    <div className="fw-semibold text-break">
                                        {environmentSummary.databaseBackend}
                                        {environmentSummary.databaseHost ? ` on ${environmentSummary.databaseHost}` : ''}
                                    </div>
                                    <div className="small text-body-secondary">
                                        Database name: {environmentSummary.databaseName ?? 'Not available'}
                                    </div>
                                </div>
                                <div className="border rounded-3 p-3">
                                    <div className="small text-body-secondary mb-1">Log File</div>
                                    <div className="fw-semibold text-break">
                                        {environmentSummary.logFilePath ?? 'Logging disabled'}
                                    </div>
                                </div>
                                <div className="border rounded-3 p-3">
                                    <div className="small text-body-secondary mb-1">CORS Origins</div>
                                    <div className="small text-body-secondary mb-0 text-break">
                                        {environmentSummary.corsOrigins.join(', ')}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Alert variant="secondary" className="mb-0">
                                Environment details are not available for this account.
                            </Alert>
                        )}
                    </Card.Body>
                </Card>
            </Col>
            <Col xl={6}>
                <Card className="shadow-sm border-0 dashboard-panel h-100">
                    <Card.Body>
                        <p className="text-uppercase small text-body-secondary mb-1">Resources</p>
                        <h2 className="h5 mb-3">API and diagnostics quick links</h2>
                        <div className="d-flex flex-column gap-3">
                            <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center border rounded-3 p-3">
                                <div>
                                    <div className="fw-semibold">Swagger API Docs</div>
                                    <div className="small text-body-secondary">
                                        Interactive API documentation for manual testing and endpoint review.
                                    </div>
                                </div>
                                <Button
                                    as="a"
                                    href={environmentSummary?.swaggerDocsUrl ?? 'http://127.0.0.1:8000/docs'}
                                    target="_blank"
                                    rel="noreferrer"
                                    variant="outline-primary"
                                >
                                    Open Swagger Docs
                                </Button>
                            </div>
                            <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center border rounded-3 p-3">
                                <div>
                                    <div className="fw-semibold">OpenAPI JSON</div>
                                    <div className="small text-body-secondary">
                                        Raw schema for integrations, code generation, or external docs.
                                    </div>
                                </div>
                                <Button
                                    as="a"
                                    href={environmentSummary?.openapiJsonUrl ?? 'http://127.0.0.1:8000/openapi.json'}
                                    target="_blank"
                                    rel="noreferrer"
                                    variant="outline-primary"
                                >
                                    Open OpenAPI JSON
                                </Button>
                            </div>
                            <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center border rounded-3 p-3">
                                <div>
                                    <div className="fw-semibold">Backend Health</div>
                                    <div className="small text-body-secondary">
                                        Quick confirmation that the API process is up and responding.
                                    </div>
                                </div>
                                <Button
                                    as="a"
                                    href={environmentSummary?.healthUrl ?? 'http://127.0.0.1:8000/health'}
                                    target="_blank"
                                    rel="noreferrer"
                                    variant="outline-primary"
                                >
                                    Open Health Check
                                </Button>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
}
