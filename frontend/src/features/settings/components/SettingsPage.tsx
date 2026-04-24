import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Container, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { apiFetch, isAbortError } from '../../../shared/api/http';
import { APP_BUILD_INFO, APP_VERSION } from '../../../shared/config/version';
import { EnvironmentSummaryRecord } from '../../../shared/types/models';
import { useCurrentUser } from '../../auth/context/CurrentUserProvider';
import { SettingsPanel } from './SettingsPanel';
import { useThemeSettings } from '../theme/ThemeProvider';

function formatBuildDate(value: string) {
    const parsedValue = Date.parse(value);
    if (Number.isNaN(parsedValue)) {
        return value;
    }

    return new Date(parsedValue).toLocaleString();
}

export function SettingsPage() {
    const { isLoading } = useThemeSettings();
    const { currentUserName, userAccess, isLoading: isCurrentUserLoading } = useCurrentUser();
    const [environmentSummary, setEnvironmentSummary] = useState<EnvironmentSummaryRecord | null>(null);
    const releaseVersion = useMemo(() => environmentSummary?.appVersion ?? APP_VERSION, [environmentSummary]);
    const isVersionAligned = useMemo(
        () => !environmentSummary || environmentSummary.appVersion === APP_VERSION,
        [environmentSummary],
    );

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
                                            <h2 className="h5 mb-0">Workspace release and runtime details</h2>
                                        </div>
                                        <Badge bg={isVersionAligned ? 'success' : 'warning'}>
                                            {isVersionAligned ? 'Version aligned' : 'Version check needed'}
                                        </Badge>
                                    </div>

                                    <Row className="g-3">
                                        <Col xl={7}>
                                            <div className="border rounded-4 p-4 h-100 about-release-card">
                                                <div className="small text-uppercase text-body-secondary mb-2">
                                                    Release
                                                </div>
                                                <h3 className="h4 mb-2">Project Tracker Workspace</h3>
                                                <div className="display-6 fw-semibold mb-2">{releaseVersion}</div>
                                                <p className="mb-0 text-body-secondary">
                                                    This is the primary application version for the workspace. It comes
                                                    from the current repo tag when one is available, otherwise it falls
                                                    back to a development commit identifier.
                                                </p>
                                            </div>
                                        </Col>
                                        <Col xl={5}>
                                            <div className="border rounded-4 p-4 h-100 about-runtime-card">
                                                <div className="small text-uppercase text-body-secondary mb-2">
                                                    Runtime
                                                </div>
                                                <div className="d-grid gap-3">
                                                    <div>
                                                        <div className="small text-body-secondary mb-1">
                                                            Frontend Build
                                                        </div>
                                                        <div className="fw-semibold">{APP_VERSION}</div>
                                                    </div>
                                                    <div>
                                                        <div className="small text-body-secondary mb-1">
                                                            Backend API
                                                        </div>
                                                        <div className="fw-semibold">
                                                            {environmentSummary?.appVersion ??
                                                                'Not available for this account'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="small text-body-secondary mb-1">
                                                            Source Of Truth
                                                        </div>
                                                        <div className="fw-semibold">
                                                            Git tag or `dev-&lt;commit&gt;`
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </Container>
    );
}
