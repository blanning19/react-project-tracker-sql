import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, InputGroup } from 'react-bootstrap';
import { DebugEntry, LogLevel, logger } from '../utils/debug';

function getLevelVariant(level: LogLevel): 'secondary' | 'info' | 'warning' | 'danger' | 'success' {
    switch (level) {
        case 'info':
            return 'info';
        case 'warn':
            return 'warning';
        case 'error':
            return 'danger';
        case 'success':
            return 'success';
        default:
            return 'secondary';
    }
}

export function DebugPanel() {
    const [logs, setLogs] = useState<DebugEntry[]>([]);
    const [textFilter, setTextFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        const unsubscribe = logger.subscribe(setLogs);
        setLogs(logger.getLogs());
        return () => {
            unsubscribe();
        };
    }, []);

    const categories = useMemo(
        () => Array.from(new Set(logs.map((entry) => entry.category))).sort((left, right) => left.localeCompare(right)),
        [logs],
    );

    const filteredLogs = useMemo(
        () =>
            logs.filter((entry) => {
                const matchesText =
                    textFilter.length === 0 ||
                    entry.message.toLowerCase().includes(textFilter.toLowerCase()) ||
                    entry.category.toLowerCase().includes(textFilter.toLowerCase());
                const matchesLevel = levelFilter === 'all' || entry.level === levelFilter;
                const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
                return matchesText && matchesLevel && matchesCategory;
            }),
        [categoryFilter, levelFilter, logs, textFilter],
    );

    return (
        <Card className="shadow-sm border-0 dashboard-panel h-100">
            <Card.Body>
                <div className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-start mb-3">
                    <div>
                        <h2 className="h5 mb-1">Frontend logs</h2>
                        <p className="mb-0 text-body-secondary small">
                            Client-side debug entries appear here as the UI makes requests and handles errors.
                        </p>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <Badge bg="secondary">{filteredLogs.length} entries</Badge>
                        <Button variant="outline-secondary" size="sm" onClick={() => logger.downloadLogs()}>
                            Export
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => logger.clear()}>
                            Clear
                        </Button>
                    </div>
                </div>

                <div className="row g-2 mb-3">
                    <div className="col-md-4">
                        <InputGroup size="sm">
                            <InputGroup.Text>Filter</InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Search logs"
                                value={textFilter}
                                onChange={(event) => setTextFilter(event.target.value)}
                            />
                        </InputGroup>
                    </div>
                    <div className="col-md-4">
                        <Form.Select
                            size="sm"
                            value={levelFilter}
                            onChange={(event) => setLevelFilter(event.target.value as LogLevel | 'all')}
                        >
                            <option value="all">All levels</option>
                            <option value="debug">Debug</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                            <option value="success">Success</option>
                        </Form.Select>
                    </div>
                    <div className="col-md-4">
                        <Form.Select size="sm" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                            <option value="all">All categories</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </Form.Select>
                    </div>
                </div>

                <div className="border rounded-3 p-3" style={{ maxHeight: '500px', overflowY: 'auto', fontFamily: 'monospace' }}>
                    {filteredLogs.length === 0 ? (
                        <Alert variant="secondary" className="mb-0">
                            No frontend debug entries yet.
                        </Alert>
                    ) : (
                        filteredLogs.map((entry, index) => {
                            const dataString = entry.data ? JSON.stringify(entry.data, null, 2) : null;
                            return (
                                <div key={`${entry.timestamp}-${index}`} className="border rounded-3 p-3 mb-2">
                                    <div className="d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-start mb-2">
                                        <div className="d-flex gap-2 align-items-center flex-wrap">
                                            <Badge bg={getLevelVariant(entry.level)}>{entry.level}</Badge>
                                            <Badge bg="secondary">{entry.category}</Badge>
                                        </div>
                                        <small className="text-body-secondary">
                                            {new Date(entry.timestamp).toLocaleString()}
                                        </small>
                                    </div>
                                    <div className="fw-semibold mb-2" style={{ fontFamily: 'inherit' }}>
                                        {entry.message}
                                    </div>
                                    {dataString ? (
                                        <details>
                                            <summary className="text-body-secondary" style={{ cursor: 'pointer' }}>
                                                View data
                                            </summary>
                                            <pre className="mt-2 mb-0 p-2 bg-dark text-light rounded small">{dataString}</pre>
                                        </details>
                                    ) : null}
                                </div>
                            );
                        })
                    )}
                </div>
            </Card.Body>
        </Card>
    );
}
