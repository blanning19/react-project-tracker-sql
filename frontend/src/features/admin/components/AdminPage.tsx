import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { apiFetch } from '../../../shared/api/http';
import {
    EnvironmentSummaryRecord,
    ImportEventRecord,
    ImportEventSummaryRecord,
    UserAccessPayload,
    UserAccessRecord,
} from '../../../shared/types/models';
import { LogViewerPanel } from '../../settings/components/LogViewerPanel';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';

function formatTimestamp(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

function formatRoleLabel(role: string) {
    return role.trim() || 'Viewer';
}

function getImportVariant(status: string): 'success' | 'danger' | 'secondary' {
    switch (status) {
        case 'Succeeded':
            return 'success';
        case 'Failed':
            return 'danger';
        default:
            return 'secondary';
    }
}

interface AccessEditorRowProps {
    currentUserName: string;
    userAccess: UserAccessRecord;
    onSaved: (nextRecord: UserAccessRecord) => void;
}

function AccessEditorRow({ currentUserName, userAccess, onSaved }: AccessEditorRowProps) {
    const [formState, setFormState] = useState<UserAccessPayload>({
        role: userAccess.role,
        canViewAdmin: userAccess.canViewAdmin,
        canViewLogs: userAccess.canViewLogs,
        notes: userAccess.notes,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setFormState({
            role: userAccess.role,
            canViewAdmin: userAccess.canViewAdmin,
            canViewLogs: userAccess.canViewLogs,
            notes: userAccess.notes,
        });
        setSaveError(null);
    }, [userAccess]);

    const isDirty =
        formState.role !== userAccess.role ||
        formState.canViewAdmin !== userAccess.canViewAdmin ||
        formState.canViewLogs !== userAccess.canViewLogs ||
        formState.notes !== userAccess.notes;

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        setSaveError(null);
        try {
            const saved = await apiFetch<UserAccessRecord>(
                `/admin/access/${encodeURIComponent(userAccess.userName)}?user_name=${encodeURIComponent(currentUserName)}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(formState),
                },
            );
            onSaved(saved);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Unable to save the updated visibility settings.');
        } finally {
            setIsSaving(false);
        }
    }, [currentUserName, formState, onSaved, userAccess.userName]);

    return (
        <tr>
            <td className="fw-semibold align-middle">{userAccess.userName}</td>
            <td className="align-middle" style={{ minWidth: '10rem' }}>
                <Form.Select
                    size="sm"
                    value={formState.role}
                    onChange={(event) =>
                        setFormState((previousState) => ({ ...previousState, role: event.target.value }))
                    }
                >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Viewer">Viewer</option>
                </Form.Select>
            </td>
            <td className="align-middle text-center">
                <Form.Check
                    type="switch"
                    checked={formState.canViewAdmin}
                    onChange={(event) =>
                        setFormState((previousState) => ({
                            ...previousState,
                            canViewAdmin: event.target.checked,
                        }))
                    }
                    aria-label={`Toggle admin visibility for ${userAccess.userName}`}
                />
            </td>
            <td className="align-middle text-center">
                <Form.Check
                    type="switch"
                    checked={formState.canViewLogs}
                    onChange={(event) =>
                        setFormState((previousState) => ({
                            ...previousState,
                            canViewLogs: event.target.checked,
                        }))
                    }
                    aria-label={`Toggle log visibility for ${userAccess.userName}`}
                />
            </td>
            <td className="align-middle" style={{ minWidth: '16rem' }}>
                <Form.Control
                    size="sm"
                    value={formState.notes}
                    onChange={(event) =>
                        setFormState((previousState) => ({ ...previousState, notes: event.target.value }))
                    }
                    placeholder="Optional admin note"
                />
                {saveError ? (
                    <div className="small text-danger mt-2" role="alert">
                        {saveError}
                    </div>
                ) : null}
            </td>
            <td className="align-middle text-end">
                <Button
                    variant="outline-primary"
                    size="sm"
                    disabled={!isDirty || isSaving}
                    onClick={() => void handleSave()}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
            </td>
        </tr>
    );
}

export function AdminPage() {
    const { settings, isLoading } = useThemeSettings();
    const currentUserName = settings?.currentUserName ?? 'Ava Patel';
    const [accessRecord, setAccessRecord] = useState<UserAccessRecord | null>(null);
    const [environmentSummary, setEnvironmentSummary] = useState<EnvironmentSummaryRecord | null>(null);
    const [importSummary, setImportSummary] = useState<ImportEventSummaryRecord | null>(null);
    const [importEvents, setImportEvents] = useState<ImportEventRecord[]>([]);
    const [userAccessList, setUserAccessList] = useState<UserAccessRecord[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isPageLoading, setIsPageLoading] = useState(true);

    const loadAdminData = useCallback(async () => {
        setIsPageLoading(true);
        setLoadError(null);

        try {
            const currentAccess = await apiFetch<UserAccessRecord>(
                `/admin/access/me?user_name=${encodeURIComponent(currentUserName)}`,
            );
            setAccessRecord(currentAccess);

            if (!currentAccess.canViewAdmin) {
                setEnvironmentSummary(null);
                setImportSummary(null);
                setImportEvents([]);
                setUserAccessList([]);
                return;
            }

            const [nextEnvironmentSummary, nextImportSummary, nextImportEvents, nextUserAccessList] = await Promise.all(
                [
                    apiFetch<EnvironmentSummaryRecord>(
                        `/admin/environment?user_name=${encodeURIComponent(currentUserName)}`,
                    ),
                    apiFetch<ImportEventSummaryRecord>(
                        `/admin/import-events/summary?user_name=${encodeURIComponent(currentUserName)}`,
                    ),
                    apiFetch<ImportEventRecord[]>(
                        `/admin/import-events?user_name=${encodeURIComponent(currentUserName)}`,
                    ),
                    apiFetch<UserAccessRecord[]>(`/admin/access?user_name=${encodeURIComponent(currentUserName)}`),
                ],
            );

            setEnvironmentSummary(nextEnvironmentSummary);
            setImportSummary(nextImportSummary);
            setImportEvents(nextImportEvents);
            setUserAccessList(nextUserAccessList);
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : 'Unable to load the admin dashboard.');
        } finally {
            setIsPageLoading(false);
        }
    }, [currentUserName]);

    useEffect(() => {
        if (isLoading) {
            return;
        }
        void loadAdminData();
    }, [isLoading, loadAdminData]);

    const failureEvents = useMemo(
        () => importEvents.filter((importEvent) => importEvent.status === 'Failed'),
        [importEvents],
    );

    const handleAccessSaved = useCallback(
        (nextRecord: UserAccessRecord) => {
            setUserAccessList((previousList) =>
                previousList.map((record) => (record.userName === nextRecord.userName ? nextRecord : record)),
            );
            if (nextRecord.userName === currentUserName) {
                setAccessRecord(nextRecord);
            }
        },
        [currentUserName],
    );

    if (isLoading || isPageLoading) {
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
                                <p className="text-uppercase small mb-2 hero-kicker">Admin</p>
                                <h1 className="display-6 fw-semibold mb-2">Workspace administration tools.</h1>
                                <p className="mb-0 text-body-secondary">
                                    Import history, environment details, visibility controls, and application
                                    diagnostics all live here now.
                                </p>
                            </div>
                            <Badge bg={accessRecord?.canViewAdmin ? 'success' : 'secondary'}>
                                {accessRecord?.canViewAdmin ? 'Admin tools enabled' : 'Admin access unavailable'}
                            </Badge>
                        </div>
                    </div>
                </Col>
            </Row>

            {loadError ? (
                <Alert variant="danger" className="mb-4">
                    {loadError}
                </Alert>
            ) : null}

            {!accessRecord?.canViewAdmin ? (
                <Alert variant="secondary" className="mb-4">
                    This account can open the Admin landing page, but the live admin tools are hidden until an admin
                    grants workspace visibility.
                </Alert>
            ) : (
                <>
                    <Row className="g-4 mb-4">
                        <Col xl={8}>
                            <Card className="shadow-sm border-0 dashboard-panel h-100">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Admin Resources</p>
                                    <h2 className="h5 mb-3">API and diagnostics quick links</h2>
                                    <div className="d-flex flex-column gap-3">
                                        <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center border rounded-3 p-3">
                                            <div>
                                                <div className="fw-semibold">Swagger API Docs</div>
                                                <div className="small text-body-secondary">
                                                    Interactive API documentation for manual testing and endpoint
                                                    review.
                                                </div>
                                            </div>
                                            <Button
                                                as="a"
                                                href={
                                                    environmentSummary?.swaggerDocsUrl ?? 'http://127.0.0.1:8000/docs'
                                                }
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
                                                href={
                                                    environmentSummary?.openapiJsonUrl ??
                                                    'http://127.0.0.1:8000/openapi.json'
                                                }
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
                        <Col xl={4}>
                            <Card className="shadow-sm border-0 dashboard-panel h-100">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Admin Context</p>
                                    <h2 className="h5 mb-3">Current workspace access</h2>
                                    <div className="d-grid gap-3">
                                        <div className="border rounded-3 p-3">
                                            <div className="small text-body-secondary mb-1">Current User</div>
                                            <div className="fw-semibold">{currentUserName}</div>
                                        </div>
                                        <div className="border rounded-3 p-3">
                                            <div className="small text-body-secondary mb-1">Role</div>
                                            <div className="fw-semibold">
                                                {formatRoleLabel(accessRecord?.role ?? 'Viewer')}
                                            </div>
                                        </div>
                                        <div className="border rounded-3 p-3">
                                            <div className="small text-body-secondary mb-1">Configured Admin User</div>
                                            <div className="fw-semibold">
                                                {environmentSummary?.adminUserName ?? 'Not available'}
                                            </div>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    <Row className="g-4 mb-4">
                        <Col md={4}>
                            <Card className="shadow-sm border-0 dashboard-panel h-100">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Import Overview</p>
                                    <h2 className="h5 mb-3">Recent import totals</h2>
                                    <div className="d-grid gap-3">
                                        <div className="border rounded-3 p-3">
                                            <div className="small text-body-secondary mb-1">Total Imports</div>
                                            <div className="display-6 fw-semibold mb-0">
                                                {importSummary?.totalImports ?? 0}
                                            </div>
                                        </div>
                                        <div className="border rounded-3 p-3">
                                            <div className="small text-body-secondary mb-1">Successful</div>
                                            <div className="h4 text-success mb-0">
                                                {importSummary?.successfulImports ?? 0}
                                            </div>
                                        </div>
                                        <div className="border rounded-3 p-3">
                                            <div className="small text-body-secondary mb-1">Failed</div>
                                            <div className="h4 text-danger mb-0">
                                                {importSummary?.failedImports ?? 0}
                                            </div>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={8}>
                            <Card className="shadow-sm border-0 dashboard-panel h-100">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Recent Imports</p>
                                    <h2 className="h5 mb-3">Import history and file activity</h2>
                                    {importEvents.length === 0 ? (
                                        <Alert variant="secondary" className="mb-0">
                                            No project imports have been recorded yet.
                                        </Alert>
                                    ) : (
                                        <div className="d-grid gap-3">
                                            {importEvents.map((importEvent) => (
                                                <div
                                                    key={importEvent.importEventId}
                                                    className="border rounded-3 p-3 d-flex flex-column gap-2"
                                                >
                                                    <div className="d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-start">
                                                        <div>
                                                            <div className="fw-semibold">
                                                                {importEvent.sourceFileName}
                                                            </div>
                                                            <div className="small text-body-secondary">
                                                                Imported by {importEvent.importedBy} on{' '}
                                                                {formatTimestamp(importEvent.createdAt)}
                                                            </div>
                                                        </div>
                                                        <Badge bg={getImportVariant(importEvent.status)}>
                                                            {importEvent.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="small">
                                                        <strong>Project:</strong>{' '}
                                                        {importEvent.projectName || 'No project created'}
                                                    </div>
                                                    <div className="small">
                                                        <strong>Tasks:</strong> {importEvent.taskCount}
                                                    </div>
                                                    <div className="small text-body-secondary">
                                                        {importEvent.message}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    <Row className="g-4 mb-4">
                        <Col xl={6}>
                            <Card className="shadow-sm border-0 dashboard-panel h-100">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Failures</p>
                                    <h2 className="h5 mb-3">Failed import summary</h2>
                                    {failureEvents.length === 0 ? (
                                        <Alert variant="success" className="mb-0">
                                            No failed imports are recorded right now.
                                        </Alert>
                                    ) : (
                                        <div className="d-grid gap-3">
                                            {failureEvents.map((importEvent) => (
                                                <div
                                                    key={importEvent.importEventId}
                                                    className="border border-danger-subtle rounded-3 p-3 bg-danger-subtle"
                                                >
                                                    <div className="fw-semibold">{importEvent.sourceFileName}</div>
                                                    <div className="small text-body-secondary mb-2">
                                                        {formatTimestamp(importEvent.createdAt)}
                                                    </div>
                                                    <div className="small">{importEvent.message}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {importSummary?.lastFailureMessage ? (
                                        <div className="small text-body-secondary mt-3">
                                            <strong>Most recent failure:</strong> {importSummary.lastFailureMessage}
                                        </div>
                                    ) : null}
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col xl={6}>
                            <Card className="shadow-sm border-0 dashboard-panel h-100">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Environment</p>
                                    <h2 className="h5 mb-3">Runtime configuration summary</h2>
                                    {environmentSummary ? (
                                        <div className="d-grid gap-3">
                                            <div className="border rounded-3 p-3">
                                                <div className="small text-body-secondary mb-1">
                                                    Application Version
                                                </div>
                                                <div className="fw-semibold">{environmentSummary.appVersion}</div>
                                            </div>
                                            <div className="border rounded-3 p-3">
                                                <div className="small text-body-secondary mb-1">Database</div>
                                                <div className="fw-semibold text-break">
                                                    {environmentSummary.databaseBackend}
                                                    {environmentSummary.databaseHost
                                                        ? ` on ${environmentSummary.databaseHost}`
                                                        : ''}
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
                    </Row>

                    <Row className="g-4 mb-4">
                        <Col xl={12}>
                            <Card className="shadow-sm border-0 dashboard-panel">
                                <Card.Body>
                                    <p className="text-uppercase small text-body-secondary mb-1">Visibility</p>
                                    <h2 className="h5 mb-3">User visibility and role controls</h2>
                                    {userAccessList.length === 0 ? (
                                        <Alert variant="secondary" className="mb-0">
                                            No access records are available yet.
                                        </Alert>
                                    ) : (
                                        <div className="table-responsive">
                                            <Table hover responsive className="align-middle mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>User</th>
                                                        <th>Role</th>
                                                        <th className="text-center">Admin</th>
                                                        <th className="text-center">Logs</th>
                                                        <th>Notes</th>
                                                        <th className="text-end">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {userAccessList.map((userAccess) => (
                                                        <AccessEditorRow
                                                            key={userAccess.userName}
                                                            currentUserName={currentUserName}
                                                            userAccess={userAccess}
                                                            onSaved={handleAccessSaved}
                                                        />
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {accessRecord.canViewLogs ? (
                        <Row className="g-4">
                            <Col xl={12}>
                                <LogViewerPanel currentUserName={currentUserName} />
                            </Col>
                        </Row>
                    ) : null}
                </>
            )}
        </Container>
    );
}
