import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Card, Col, Container, Nav, Row, Spinner } from 'react-bootstrap';
import { apiFetch } from '../../../shared/api/http';
import { DEFAULT_USER_NAME } from '../../../shared/config/app';
import { EnvironmentSummaryRecord, ImportEventRecord, UserAccessRecord } from '../../../shared/types/models';
import { useThemeSettings } from '../../settings/theme/ThemeProvider';
import { AccessTab } from './AccessTab';
import { AdminTabKey, ImportFilterRange } from './adminTypes';
import { copyToClipboard, formatRoleLabel, isImportWithinRange } from './adminUtils';
import { EnvironmentTab } from './EnvironmentTab';
import { ImportsTab } from './ImportsTab';
import { LogsTab } from './LogsTab';

export function AdminPage() {
    const { settings, isLoading } = useThemeSettings();
    const currentUserName = settings?.currentUserName ?? DEFAULT_USER_NAME;
    const [accessRecord, setAccessRecord] = useState<UserAccessRecord | null>(null);
    const [environmentSummary, setEnvironmentSummary] = useState<EnvironmentSummaryRecord | null>(null);
    const [importEvents, setImportEvents] = useState<ImportEventRecord[]>([]);
    const [userAccessList, setUserAccessList] = useState<UserAccessRecord[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [selectedLogTimestamp, setSelectedLogTimestamp] = useState<string | null>(null);
    const [selectedLogCorrelationId, setSelectedLogCorrelationId] = useState<string | null>(null);
    const [copiedCorrelationId, setCopiedCorrelationId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<AdminTabKey>('imports');
    const [importFilter, setImportFilter] = useState<ImportFilterRange>('30d');

    // After the page was split into tab components, the parent keeps ownership of
    // the shared data fetch so each tab stays presentational and easier to test.
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
                setImportEvents([]);
                setUserAccessList([]);
                return;
            }

            // These datasets power independent tabs, so loading them in parallel
            // keeps the admin shell responsive without coupling the tab components.
            const [nextEnvironmentSummary, nextImportEvents, nextUserAccessList] = await Promise.all([
                apiFetch<EnvironmentSummaryRecord>(
                    `/admin/environment?user_name=${encodeURIComponent(currentUserName)}`,
                ),
                apiFetch<ImportEventRecord[]>(`/admin/import-events?user_name=${encodeURIComponent(currentUserName)}`),
                apiFetch<UserAccessRecord[]>(`/admin/access?user_name=${encodeURIComponent(currentUserName)}`),
            ]);

            setEnvironmentSummary(nextEnvironmentSummary);
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

    const filteredImportEvents = useMemo(
        () => importEvents.filter((importEvent) => isImportWithinRange(importEvent, importFilter)),
        [importEvents, importFilter],
    );

    const filteredFailureEvents = useMemo(
        () => filteredImportEvents.filter((importEvent) => importEvent.status === 'Failed'),
        [filteredImportEvents],
    );

    // The page keeps a tiny derived summary so the imports tab can show trend
    // information without needing a second API endpoint.
    const filteredImportSummary = useMemo(() => {
        const successfulImports = filteredImportEvents.filter(
            (importEvent) => importEvent.status === 'Succeeded',
        ).length;
        const failedImports = filteredFailureEvents.length;
        const lastFailure = filteredFailureEvents[0];
        return {
            totalImports: filteredImportEvents.length,
            successfulImports,
            failedImports,
            lastFailureMessage: lastFailure?.failureReason || lastFailure?.message || null,
        };
    }, [filteredFailureEvents, filteredImportEvents]);

    // Save callbacks update local state in-place so admins immediately see the
    // result of a permission change without paying for a full page refetch.
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

    const handleCopyCorrelationId = useCallback(async (correlationId: string) => {
        try {
            await copyToClipboard(correlationId);
            setCopiedCorrelationId(correlationId);
            window.setTimeout(() => {
                setCopiedCorrelationId((currentValue) => (currentValue === correlationId ? null : currentValue));
            }, 2000);
        } catch {
            setCopiedCorrelationId(null);
        }
    }, []);

    // Import cards hand the log tab enough context to load only the lines
    // tied to the selected failure instead of dumping a broad time window.
    const handleViewLogContext = useCallback((importEvent: ImportEventRecord) => {
        setSelectedLogTimestamp(importEvent.createdAt);
        setSelectedLogCorrelationId(importEvent.correlationId || null);
        setActiveTab('logs');
    }, []);

    const handleResetLogSelection = useCallback(() => {
        setSelectedLogTimestamp(null);
        setSelectedLogCorrelationId(null);
    }, []);

    if (isLoading || isPageLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <Spinner animation="border" role="status" />
            </div>
        );
    }

    if (!accessRecord?.canViewAdmin) {
        return (
            <Container fluid="xl" className="pt-3 pt-lg-4 pb-4 pb-lg-5">
                <Row className="g-4 align-items-stretch mb-4">
                    <Col xl={12}>
                        <div className="hero-panel rounded-4 shadow-sm h-100 p-4 p-lg-5">
                            <p className="text-uppercase small mb-2 hero-kicker">Admin</p>
                            <h1 className="display-6 fw-semibold mb-2">Workspace administration tools.</h1>
                            <p className="mb-0 text-body-secondary">
                                Import history, environment details, visibility controls, and application diagnostics
                                all live here now.
                            </p>
                        </div>
                    </Col>
                </Row>
                {loadError ? (
                    <Alert variant="danger" className="mb-4">
                        {loadError}
                    </Alert>
                ) : null}
                <Alert variant="secondary" className="mb-4">
                    This account can open the Admin landing page, but the live admin tools are hidden until an admin
                    grants workspace visibility.
                </Alert>
            </Container>
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
                            <Badge bg="success">Admin tools enabled</Badge>
                        </div>
                    </div>
                </Col>
            </Row>

            {loadError ? (
                <Alert variant="danger" className="mb-4">
                    {loadError}
                </Alert>
            ) : null}

            <Row className="g-4 mb-4">
                <Col xl={12}>
                    <Card className="shadow-sm border-0 dashboard-panel">
                        <Card.Body className="pb-2">
                            <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-start mb-3">
                                <div>
                                    <p className="text-uppercase small text-body-secondary mb-1">Admin Context</p>
                                    <h2 className="h5 mb-1">Current workspace access</h2>
                                    <p className="mb-0 small text-body-secondary">
                                        Signed in as {currentUserName} with role {formatRoleLabel(accessRecord.role)}.
                                    </p>
                                </div>
                                <div className="small text-body-secondary text-lg-end">
                                    Configured admin user:{' '}
                                    <span className="fw-semibold text-body">
                                        {environmentSummary?.adminUserName ?? 'Not available'}
                                    </span>
                                </div>
                            </div>
                            <Nav
                                variant="tabs"
                                activeKey={activeTab}
                                onSelect={(key) => {
                                    if (key) {
                                        setActiveTab(key as AdminTabKey);
                                    }
                                }}
                            >
                                <Nav.Item>
                                    <Nav.Link eventKey="imports">Imports</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="access">Access</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="environment">Environment</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="logs">Logs</Nav.Link>
                                </Nav.Item>
                            </Nav>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {activeTab === 'imports' ? (
                <ImportsTab
                    copiedCorrelationId={copiedCorrelationId}
                    importEvents={filteredImportEvents}
                    importFilter={importFilter}
                    importSummary={filteredImportSummary}
                    onCopyCorrelationId={handleCopyCorrelationId}
                    onFilterChange={setImportFilter}
                    onViewLogContext={handleViewLogContext}
                />
            ) : null}

            {activeTab === 'access' ? (
                <AccessTab
                    currentUserName={currentUserName}
                    userAccessList={userAccessList}
                    onAccessSaved={handleAccessSaved}
                />
            ) : null}

            {activeTab === 'environment' ? <EnvironmentTab environmentSummary={environmentSummary} /> : null}

            {activeTab === 'logs' ? (
                <LogsTab
                    canViewLogs={accessRecord.canViewLogs}
                    currentUserName={currentUserName}
                    selectedLogTimestamp={selectedLogTimestamp}
                    selectedLogCorrelationId={selectedLogCorrelationId}
                    onResetSelection={handleResetLogSelection}
                />
            ) : null}
        </Container>
    );
}
