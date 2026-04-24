import { useState } from 'react';
import { Alert, Button, Card, Col, Nav, Row } from 'react-bootstrap';
import { LogViewerPanel } from '../../features/settings/components/LogViewerPanel';
import { DebugPanel } from './DebugPanel';

interface DiagnosticsConsoleProps {
    canViewLogs: boolean;
    currentUserName: string;
    selectedLogTimestamp?: string | null;
    selectedLogCorrelationId?: string | null;
    onResetSelection?: () => void;
    defaultTab?: 'backend' | 'frontend';
    title?: string;
    description?: string;
}

export function DiagnosticsConsole({
    canViewLogs,
    currentUserName,
    selectedLogTimestamp = null,
    selectedLogCorrelationId = null,
    onResetSelection,
    defaultTab = 'frontend',
    title = 'Frontend and Backend logging tools',
    description = 'Switch between server logs and the in-browser debug console without leaving the current workspace.',
}: DiagnosticsConsoleProps) {
    const [activeDiagnosticsTab, setActiveDiagnosticsTab] = useState<'backend' | 'frontend'>(defaultTab);

    return (
        <Row className="g-4">
            <Col xl={12}>
                <Card className="shadow-sm border-0 dashboard-panel">
                    <Card.Body className="pb-2">
                        <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-start mb-3">
                            <div>
                                <p className="text-uppercase small text-body-secondary mb-1">Diagnostics</p>
                                <h2 className="h5 mb-1">{title}</h2>
                                <p className="mb-0 small text-body-secondary">{description}</p>
                            </div>
                            {activeDiagnosticsTab === 'frontend' && selectedLogTimestamp && onResetSelection ? (
                                <Button variant="outline-secondary" size="sm" onClick={onResetSelection}>
                                    Show latest log lines
                                </Button>
                            ) : null}
                        </div>
                        <Nav
                            variant="tabs"
                            activeKey={activeDiagnosticsTab}
                            onSelect={(key) => {
                                if (key === 'backend' || key === 'frontend') {
                                    setActiveDiagnosticsTab(key);
                                }
                            }}
                        >
                            <Nav.Item>
                                <Nav.Link eventKey="frontend">Frontend</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="backend">Backend</Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </Card.Body>
                </Card>
            </Col>
            <Col xl={12}>
                {activeDiagnosticsTab === 'backend' ? (
                    canViewLogs ? (
                        <LogViewerPanel
                            currentUserName={currentUserName}
                            aroundTimestamp={selectedLogTimestamp}
                            correlationId={selectedLogCorrelationId}
                        />
                    ) : (
                        <Alert variant="secondary" className="mb-0">
                            This account does not currently have log visibility enabled.
                        </Alert>
                    )
                ) : (
                    <DebugPanel />
                )}
            </Col>
        </Row>
    );
}
