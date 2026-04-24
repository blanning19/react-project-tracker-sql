import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap';
import { apiFetch } from '../../../shared/api/http';
import { LogFileRecord, LogLineRecord } from '../../../shared/types/models';

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

function formatTimestamp(value: string | null) {
    if (!value) {
        return 'Timestamp unavailable';
    }

    return new Date(value).toLocaleString();
}

function exportLogLines(lines: LogLineRecord[]) {
    const blob = new Blob([JSON.stringify(lines, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `backend-log-lines-${new Date().toISOString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function LogViewerPanel({ currentUserName, aroundTimestamp = null, correlationId = null }: LogViewerPanelProps) {
    const [logFile, setLogFile] = useState<LogFileRecord | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [textFilter, setTextFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const errorCount = useMemo(
        () => (logFile?.lines ?? []).filter((line) => line.level === 'ERROR' || line.level === 'CRITICAL').length,
        [logFile],
    );
    const levelOptions = useMemo(
        () => Array.from(new Set((logFile?.lines ?? []).map((line) => line.level))).sort((left, right) => left.localeCompare(right)),
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

    const filteredLines = useMemo(
        () =>
            (logFile?.lines ?? []).filter((line) => {
                const matchesLevel = levelFilter === 'all' || line.level === levelFilter;
                const filterValue = textFilter.trim().toLowerCase();
                const matchesText =
                    filterValue.length === 0 ||
                    line.content.toLowerCase().includes(filterValue) ||
                    line.level.toLowerCase().includes(filterValue) ||
                    (line.correlationId ?? '').toLowerCase().includes(filterValue);
                return matchesLevel && matchesText;
            }),
        [levelFilter, logFile, textFilter],
    );

    const visibleLines = useMemo(
        () => [...filteredLines].sort((left, right) => right.lineNumber - left.lineNumber),
        [filteredLines],
    );

    const handleCopyVisibleLines = useCallback(async () => {
        const content = visibleLines
            .map((line) =>
                [
                    `Line ${line.lineNumber}`,
                    `Level: ${line.level}`,
                    `Timestamp: ${formatTimestamp(line.timestamp)}`,
                    line.correlationId ? `Correlation ID: ${line.correlationId}` : null,
                    `Content: ${line.content}`,
                ]
                    .filter(Boolean)
                    .join('\n'),
            )
            .join('\n\n');

        await navigator.clipboard.writeText(content);
    }, [visibleLines]);

    return (
        <Card className="shadow-sm border-0 dashboard-panel">
            <Card.Body>
                <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-start mb-3">
                    <div>                        
                        <h2 className="h5 mb-1">Backend logs</h2>
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
                        <Badge bg="secondary">
                            {visibleLines.length} visible
                        </Badge>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => exportLogLines(visibleLines)}
                            disabled={visibleLines.length === 0}
                        >
                            Export
                        </Button>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => void handleCopyVisibleLines()}
                            disabled={visibleLines.length === 0}
                        >
                            Copy visible
                        </Button>
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

                <div className="row g-2 mb-3">
                    <div className="col-md-8">
                        <InputGroup size="sm">
                            <InputGroup.Text>Filter</InputGroup.Text>
                            <Form.Control
                                type="text"
                                value={textFilter}
                                placeholder="Search by message text, level, or correlation ID"
                                onChange={(event) => setTextFilter(event.target.value)}
                            />
                        </InputGroup>
                    </div>
                    <div className="col-md-4">
                        <Form.Select size="sm" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}>
                            <option value="all">All levels</option>
                            {levelOptions.map((levelOption) => (
                                <option key={levelOption} value={levelOption}>
                                    {levelOption}
                                </option>
                            ))}
                        </Form.Select>
                    </div>
                </div>

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
                ) : visibleLines.length === 0 ? (
                    <Alert variant="secondary" className="mb-0">
                        No log lines match the current filters.
                    </Alert>
                ) : (
                    <div className="border rounded-3 p-3 log-viewer-shell">
                        {visibleLines.map((line) => (
                            <div
                                key={line.lineNumber}
                                className={`backend-log-entry rounded-3 p-3 mb-2 ${
                                    line.isContextMatch
                                        ? 'border border-primary-subtle'
                                        : line.level === 'ERROR' || line.level === 'CRITICAL'
                                          ? 'bg-danger-subtle'
                                          : line.level === 'WARNING'
                                            ? 'bg-warning-subtle'
                                            : ''
                                }`}
                            >
                                <div className="d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-start mb-2">
                                    <div className="d-flex gap-2 align-items-center flex-wrap">
                                        <span className="text-body-secondary small log-viewer-line-number">
                                            #{line.lineNumber}
                                        </span>
                                        <Badge bg={getVariant(line.level)}>{line.level}</Badge>
                                        {line.correlationId ? (
                                            <Badge bg="secondary" pill>
                                                Correlated
                                            </Badge>
                                        ) : null}
                                        {line.isContextMatch ? <Badge bg="primary">Context match</Badge> : null}
                                    </div>
                                    <small className="text-body-secondary">{formatTimestamp(line.timestamp)}</small>
                                </div>
                                <code className="small d-block text-wrap log-viewer-line-content">{line.content}</code>
                                {(line.correlationId || line.timestamp) ? (
                                    <details className="mt-2">
                                        <summary className="text-body-secondary small" style={{ cursor: 'pointer' }}>
                                            View metadata
                                        </summary>
                                        <div className="small text-body-secondary mt-2 d-grid gap-1">
                                            {line.timestamp ? (
                                                <div>
                                                    <strong>Timestamp:</strong> {formatTimestamp(line.timestamp)}
                                                </div>
                                            ) : null}
                                            {line.correlationId ? (
                                                <div>
                                                    <strong>Correlation ID:</strong> <code>{line.correlationId}</code>
                                                </div>
                                            ) : null}
                                        </div>
                                    </details>
                                ) : null}
                            </div>
                        ))}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
}
