import { useEffect, useState } from 'react';
import { Alert, Badge, Card, Col, Container, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { apiFetch, isAbortError } from '../../../shared/api/http';
import { APP_BUILD_INFO, APP_VERSION } from '../../../shared/config/version';
import { EnvironmentSummaryRecord } from '../../../shared/types/models';
import { useCurrentUser } from '../../auth/context/CurrentUserProvider';
import { SettingsPanel } from './SettingsPanel';
import { useThemeSettings } from '../theme/ThemeProvider';

export function SettingsPage() {
    const { isLoading } = useThemeSettings();
    const { currentUserName, userAccess, isLoading: isCurrentUserLoading } = useCurrentUser();
    const [environmentSummary, setEnvironmentSummary] = useState<EnvironmentSummaryRecord | null>(null);

    useEffect(() => {
        if (isCurrentUserLoading) {
            return;
        }

        const controller = new AbortController();
        let isActive = true;

        apiFetch<EnvironmentSummaryRecord>(`/admin/environment?user_name=${encodeURIComponent(currentUserName)}`, {
            signal: controller.signal,
        })
            .then((summary) => {
                if (isActive) {
                    setEnvironmentSummary(summary);
                }
            })
            .catch((error) => {
                if (isAbortError(error)) {
                    return;
                }

                if (isActive) {
                    setEnvironmentSummary(null);
                }
            });

        return () => {
            isActive = false;
            controller.abort();
        };
    }, [currentUserName, isCurrentUserLoading]);

    if (isLoading || isCurrentUserLoading) {
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
                        <p className="text-uppercase small mb-2 hero-kicker">Settings</p>
                        <h1 className="display-6 fw-semibold mb-2">Manage your workspace preferences.</h1>
                        <p className="mb-0 text-body-secondary">
                            Theme mode and saved dashboard sort preferences for {currentUserName} live here now.
                        </p>
                    </div>
                </Col>
            </Row>

            <Row className="g-4">
                <Col xl={8}>
                    <Tabs defaultActiveKey="preferences" id="settings-tabs" className="mb-3">
                        <Tab eventKey="preferences" title="Preferences">
                            <SettingsPanel />
                        </Tab>
                        <Tab eventKey="user" title="User Information">
                            <Card className="shadow-sm border-0 dashboard-panel">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <p className="text-uppercase small text-body-secondary mb-1">User</p>
                                            <h2 className="h5 mb-0">Current workspace identity</h2>
                                        </div>
                                        <Badge bg={userAccess?.role === 'Admin' ? 'danger' : 'secondary'}>
                                            {userAccess?.role ?? 'User'}
                                        </Badge>
                                    </div>

                                    <Row className="g-3">
                                        <Col md={6}>
                                            <div className="border rounded-3 p-3 h-100">
                                                <div className="small text-body-secondary mb-1">Current User</div>
                                                <div className="fw-semibold text-break">{currentUserName}</div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="border rounded-3 p-3 h-100">
                                                <div className="small text-body-secondary mb-1">Admin Access</div>
                                                <div className="fw-semibold">
                                                    {userAccess?.canViewAdmin ? 'Enabled' : 'Not enabled'}
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="border rounded-3 p-3 h-100">
                                                <div className="small text-body-secondary mb-1">Log Access</div>
                                                <div className="fw-semibold">
                                                    {userAccess?.canViewLogs ? 'Enabled' : 'Not enabled'}
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="border rounded-3 p-3 h-100">
                                                <div className="small text-body-secondary mb-1">Access Notes</div>
                                                <div className="text-body-secondary">
                                                    {userAccess?.notes?.trim() ? userAccess.notes : 'No access notes recorded.'}
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Tab>
                        <Tab eventKey="about" title="About">
                            <Card className="shadow-sm border-0 dashboard-panel">
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <p className="text-uppercase small text-body-secondary mb-1">About</p>
                                            <h2 className="h5 mb-0">Workspace runtime details</h2>
                                        </div>
                                        <Badge bg="secondary">Local app</Badge>
                                    </div>

                                    <Row className="g-3">
                                        <Col md={6}>
                                            <div className="border rounded-3 p-3 h-100">
                                                <div className="small text-body-secondary mb-1">Application</div>
                                                <div className="fw-semibold">Project Tracker Workspace</div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="border rounded-3 p-3 h-100">
                                                <div className="small text-body-secondary mb-1">Frontend Version</div>
                                                <div className="fw-semibold">{APP_VERSION}</div>
                                                <div className="small text-body-secondary mt-1">
                                                    Branch: {APP_BUILD_INFO.branch} | Commit: {APP_BUILD_INFO.commitHash}
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="border rounded-3 p-3 h-100">
                                                <div className="small text-body-secondary mb-1">Backend API Version</div>
                                                <div className="fw-semibold">
                                                    {environmentSummary?.appVersion ?? 'Not available for this account'}
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="border rounded-3 p-3 h-100">
                                                <div className="small text-body-secondary mb-1">Build Timestamp</div>
                                                <div className="fw-semibold">{APP_BUILD_INFO.buildDate}</div>
                                            </div>
                                        </Col>
                                    </Row>

                                    <Alert variant="secondary" className="mt-3 mb-0">
                                        Theme preferences stay in the settings flow today. As we bring in more
                                        Ontology-backed patterns, this page can keep the same layout while the data
                                        source changes under the hood.
                                    </Alert>
                                </Card.Body>
                            </Card>
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </Container>
    );
}
