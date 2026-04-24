export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface DebugEntry {
    timestamp: string;
    level: LogLevel;
    category: string;
    message: string;
    data?: unknown;
    stackTrace?: string;
}

class DebugLogger {
    private logs: DebugEntry[] = [];
    private listeners = new Set<(logs: DebugEntry[]) => void>();
    private readonly maxLogs = 500;

    private addLog(level: LogLevel, category: string, message: string, data?: unknown) {
        const entry: DebugEntry = {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data,
            stackTrace: level === 'error' ? new Error().stack : undefined,
        };

        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        this.notifyListeners();

        if (import.meta.env.DEV) {
            const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
            console[consoleMethod](`[${category}] ${message}`, data ?? '');
        }
    }

    debug(category: string, message: string, data?: unknown) {
        this.addLog('debug', category, message, data);
    }

    info(category: string, message: string, data?: unknown) {
        this.addLog('info', category, message, data);
    }

    warn(category: string, message: string, data?: unknown) {
        this.addLog('warn', category, message, data);
    }

    error(category: string, message: string, data?: unknown) {
        this.addLog('error', category, message, data);
    }

    success(category: string, message: string, data?: unknown) {
        this.addLog('success', category, message, data);
    }

    getLogs() {
        return [...this.logs];
    }

    clear() {
        this.logs = [];
        this.notifyListeners();
    }

    subscribe(listener: (logs: DebugEntry[]) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    downloadLogs() {
        const blob = new Blob([this.exportLogs()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `frontend-debug-${new Date().toISOString()}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private notifyListeners() {
        const snapshot = [...this.logs];
        this.listeners.forEach((listener) => listener(snapshot));
    }
}

export const logger = new DebugLogger();

