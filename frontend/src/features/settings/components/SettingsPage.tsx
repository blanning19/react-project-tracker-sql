import { Col, Container, Row, Spinner } from 'react-bootstrap';
import { SettingsPanel } from './SettingsPanel';
import { useThemeSettings } from '../theme/ThemeProvider';

export function SettingsPage() {
    const { settings, isLoading } = useThemeSettings();

    if (isLoading) {
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
                            Theme mode and saved dashboard sort preferences for{' '}
                            {settings?.currentUserName ?? 'Ava Patel'} live here now.
                        </p>
                    </div>
                </Col>
            </Row>

            <Row className="g-4">
                <Col xl={8}>
                    <SettingsPanel />
                </Col>
            </Row>
        </Container>
    );
}
