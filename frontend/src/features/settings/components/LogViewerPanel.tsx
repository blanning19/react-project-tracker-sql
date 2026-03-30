import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import { apiFetch } from '../../../shared/api/http';
import { LogFileRecord } from '../../../shared/types/models';

interface LogViewerPanelProps {
    currentUserName: string;
    aroundTimestamp?: string | null;
    correlationId?: string | null;
}

function getVariant(level: string): 'danger' | 'warning' | 'info' | 'secondary' {
    switch (level) {
        case 'CRITICAL':
        case 'ERROR':
            return 'danger';
        case 'WARNING':
            return 'warning';
        case 'INFO':
            return 'info';
        default:
            return 'secondary';
    }
}

export function LogViewerPanel({ currentUserName, aroundTimestamp = null, correlationId = null }: LogViewerPanelProps) {
    const [logFile, setLogFile] = useState<LogFileRecord | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const errorCount = useMemo(
        () => (logFile?.lines ?? []).filter((line) => line.level === 'ERROR' || line.level === 'CRITICAL').length,
        [logFile],
    );
    const requestPath = useMemo(() => {
        const params = new URLSearchParams({ user_name: currentUserName });
        if (aroundTimestamp) {
            params.set('around_timestamp', aroundTimestamp);
        }
        if (correlationId) {
            params.set('correlation_id', correlationId);
        }
        return `/logs/current?${params.toString()}`;
    }, [aroundTimestamp, correlationId, currentUserName]);

    const loadLogFile = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiFetch<LogFileRecord>(requestPath);
            setLogFile(data);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load the current log file.');
        } finally {
            setIsLoading(false);
        }
    }, [requestPath]);

    useEffect(() => {
        void loadLogFile();
    }, [loadLogFile]);

    return (
        <Card className="shadow-sm border-0 dashboard-panel">
            <Card.Body>
                <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-start mb-3">
                    <div>
                        <p className="text-uppercase small text-body-secondary mb-1">Application Log</p>
                        <h2 className="h5 mb-1">Current backend log file</h2>
                        <p className="mb-0 text-body-secondary small">
                            {aroundTimestamp
                                ? correlationId
                                    ? 'Showing log lines for the selected import attempt.'
                                    : 'Showing log lines near the selected failed import event.'
                                : 'Recent log lines are shown here with warning and error highlighting.'}
                        </p>
                        {correlationId ? (
                            <p className="mb-0 mt-2 text-body-secondary small">
                                <strong>Correlation ID:</strong> <code>{correlationId}</code>
                            </p>
                        ) : null}
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <Badge bg={errorCount > 0 ? 'danger' : 'secondary'}>
                            {errorCount} error{errorCount === 1 ? '' : 's'}
                        </Badge>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => void loadLogFile()}
                            disabled={isLoading}
                        >
                            Refresh
                        </Button>
                    </div>
                </div>

                {logFile?.filePath ? (
                    <p className="small text-body-secondary mb-3">
                        <strong>File:</strong> {logFile.filePath}
                    </p>
                ) : null}

                {error ? (
                    <Alert variant="danger" className="mb-0">
                        {error}
                    </Alert>
                ) : isLoading ? (
                    <div className="d-flex justify-content-center py-4">
                        <Spinner animation="border" role="status" />
                    </div>
                ) : !logFile || logFile.lines.length === 0 ? (
                    <Alert variant="secondary" className="mb-0">
                        No log lines were found.
                    </Alert>
                ) : (
                    <div
                        className="border rounded-3 p-3"
                        style={{ maxHeight: '28rem', overflowY: 'auto', backgroundColor: 'var(--bs-tertiary-bg)' }}
                    >
                        {logFile.lines.map((line) => (
                            <div
                                key={line.lineNumber}
                                className={`d-flex gap-3 py-2 px-2 rounded-2 mb-1 ${
                                    line.isContextMatch
                                        ? 'border border-primary-subtle'
                                        : line.level === 'ERROR' || line.level === 'CRITICAL'
                                          ? 'bg-danger-subtle'
                                          : line.level === 'WARNING'
                                            ? 'bg-warning-subtle'
                                            : ''
                                }`}
                            >
                                <span className="text-body-secondary small" style={{ minWidth: '3.5rem' }}>
                                    {line.lineNumber}
                                </span>
                                <Badge bg={getVariant(line.level)}>{line.level}</Badge>
                                {line.correlationId ? (
                                    <Badge bg="secondary" pill>
                                        Import
                                    </Badge>
                                ) : null}
                                <code className="small text-wrap" style={{ whiteSpace: 'pre-wrap' }}>
                                    {line.content}
                                </code>
                            </div>
                        ))}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
}
