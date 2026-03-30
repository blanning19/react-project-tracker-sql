import { Alert, Button, Col, Row } from 'react-bootstrap';
import { LogViewerPanel } from '../../settings/components/LogViewerPanel';

interface LogsTabProps {
    canViewLogs: boolean;
    currentUserName: string;
    selectedLogTimestamp: string | null;
    selectedLogCorrelationId: string | null;
    onResetSelection: () => void;
}

export function LogsTab({
    canViewLogs,
    currentUserName,
    selectedLogTimestamp,
    selectedLogCorrelationId,
    onResetSelection,
}: LogsTabProps) {
    return (
        <Row className="g-4">
            <Col xl={12}>
                {canViewLogs ? (
                    <>
                        {/* When a failed import selects log context, this action
                            lets admins return to the broader rolling log view. */}
                        {selectedLogTimestamp ? (
                            <div className="d-flex justify-content-end mb-3">
                                <Button variant="outline-secondary" size="sm" onClick={onResetSelection}>
                                    Show latest log lines
                                </Button>
                            </div>
                        ) : null}
                        <LogViewerPanel
                            currentUserName={currentUserName}
                            aroundTimestamp={selectedLogTimestamp}
                            correlationId={selectedLogCorrelationId}
                        />
                    </>
                ) : (
                    <Alert variant="secondary" className="mb-0">
                        This account does not currently have log visibility enabled.
                    </Alert>
                )}
            </Col>
        </Row>
    );
}
