import { Alert, Badge, Button, Card, Col, Form, Row } from 'react-bootstrap';
import { ImportEventRecord } from '../../../shared/types/models';
import { ImportFilterRange } from './adminTypes';
import { formatTimestamp, getImportVariant } from './adminUtils';

interface ImportSummary {
    totalImports: number;
    successfulImports: number;
    failedImports: number;
    lastFailureMessage: string | null;
}

interface ImportsTabProps {
    copiedCorrelationId: string | null;
    importEvents: ImportEventRecord[];
    importFilter: ImportFilterRange;
    importSummary: ImportSummary;
    onCopyCorrelationId: (correlationId: string) => Promise<void>;
    onFilterChange: (nextRange: ImportFilterRange) => void;
    onViewLogContext: (importEvent: ImportEventRecord) => void;
}

function getRangeLabel(importFilter: ImportFilterRange) {
    return importFilter === '7d'
        ? 'Showing the last 7 days'
        : importFilter === '30d'
          ? 'Showing the last 30 days'
          : importFilter === '90d'
            ? 'Showing the last 90 days'
            : 'Showing all recorded imports';
}

export function ImportsTab({
    copiedCorrelationId,
    importEvents,
    importFilter,
    importSummary,
    onCopyCorrelationId,
    onFilterChange,
    onViewLogContext,
}: ImportsTabProps) {
    return (
        <Row className="g-4 mb-4">
            <Col md={4}>
                <Card className="shadow-sm border-0 dashboard-panel h-100">
                    <Card.Body>
                        <p className="text-uppercase small text-body-secondary mb-1">Import Overview</p>
                        <h2 className="h5 mb-3">Import activity for selected range</h2>
                        <p className="small text-body-secondary">
                            Import events are filtered here so the Admin page stays readable even when the audit history
                            grows over time.
                        </p>
                        <Form.Group className="mb-3">
                            <Form.Label className="small text-body-secondary mb-1">Date Range</Form.Label>
                            <Form.Select
                                value={importFilter}
                                onChange={(event) => onFilterChange(event.target.value as ImportFilterRange)}
                            >
                                <option value="7d">Last 7 days</option>
                                <option value="30d">Last 30 days</option>
                                <option value="90d">Last 90 days</option>
                                <option value="all">All history</option>
                            </Form.Select>
                        </Form.Group>
                        <div className="d-grid gap-3">
                            <div className="border rounded-3 p-3">
                                <div className="small text-body-secondary mb-1">Total Imports</div>
                                <div className="display-6 fw-semibold mb-0">{importSummary.totalImports}</div>
                            </div>
                            <div className="border rounded-3 p-3">
                                <div className="small text-body-secondary mb-1">Successful</div>
                                <div className="h4 text-success mb-0">{importSummary.successfulImports}</div>
                            </div>
                            <div className="border rounded-3 p-3">
                                <div className="small text-body-secondary mb-1">Failed</div>
                                <div className="h4 text-danger mb-0">{importSummary.failedImports}</div>
                            </div>
                            {importSummary.lastFailureMessage ? (
                                <div className="border rounded-3 p-3 bg-danger-subtle">
                                    <div className="small text-body-secondary mb-1">Latest failure summary</div>
                                    <div className="small">{importSummary.lastFailureMessage}</div>
                                </div>
                            ) : null}
                        </div>
                    </Card.Body>
                </Card>
            </Col>
            <Col md={8}>
                <Card className="shadow-sm border-0 dashboard-panel h-100">
                    <Card.Body>
                        <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center mb-3">
                            <div>
                                <p className="text-uppercase small text-body-secondary mb-1">Recent Imports</p>
                                <h2 className="h5 mb-0">Import history and failure detail</h2>
                            </div>
                            <div className="small text-body-secondary">{getRangeLabel(importFilter)}</div>
                        </div>

                        {importEvents.length === 0 ? (
                            <Alert variant="secondary" className="mb-0">
                                No project imports were found for this time range.
                            </Alert>
                        ) : (
                            // Failures stay inline with the import history so admins can
                            // scan one audit stream instead of hunting across sections.
                            <div className="d-grid gap-3">
                                {importEvents.map((importEvent) => (
                                    <div
                                        key={importEvent.importEventId}
                                        className={`border rounded-3 p-3 d-flex flex-column gap-2 ${
                                            importEvent.status === 'Failed'
                                                ? 'bg-danger-subtle border-danger-subtle'
                                                : ''
                                        }`}
                                    >
                                        <div className="d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-start">
                                            <div>
                                                <div className="fw-semibold">{importEvent.sourceFileName}</div>
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
                                            <strong>Project:</strong> {importEvent.projectName || 'No project created'}
                                        </div>
                                        <div className="small">
                                            <strong>Tasks:</strong> {importEvent.taskCount}
                                        </div>
                                        {importEvent.status === 'Failed' ? (
                                            <>
                                                <div className="small">
                                                    <strong>Reason:</strong>{' '}
                                                    {importEvent.failureReason || importEvent.message}
                                                </div>
                                                {importEvent.correlationId ? (
                                                    <div className="small text-body-secondary">
                                                        <strong>Correlation ID:</strong>{' '}
                                                        <code>{importEvent.correlationId}</code>
                                                    </div>
                                                ) : null}
                                                {importEvent.technicalDetails ? (
                                                    <div className="small text-body-secondary">
                                                        <strong>Technical details:</strong>{' '}
                                                        {importEvent.technicalDetails}
                                                    </div>
                                                ) : null}
                                                <div className="d-flex flex-wrap gap-2 pt-1">
                                                    {importEvent.correlationId ? (
                                                        <Button
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            onClick={() =>
                                                                void onCopyCorrelationId(importEvent.correlationId)
                                                            }
                                                        >
                                                            {copiedCorrelationId === importEvent.correlationId
                                                                ? 'Copied'
                                                                : 'Copy correlation ID'}
                                                        </Button>
                                                    ) : null}
                                                    <Button
                                                        variant="outline-dark"
                                                        size="sm"
                                                        onClick={() => onViewLogContext(importEvent)}
                                                    >
                                                        View related log context
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="small text-body-secondary">{importEvent.message}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
}
