import { DiagnosticsConsole } from '../../../shared/components/DiagnosticsConsole';

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
        <DiagnosticsConsole
            canViewLogs={canViewLogs}
            currentUserName={currentUserName}
            selectedLogTimestamp={selectedLogTimestamp}
            selectedLogCorrelationId={selectedLogCorrelationId}
            onResetSelection={onResetSelection}
            defaultTab="frontend"
            description="Switch between server logs and the in-browser debug console without leaving the Admin workspace."
        />
    );
}
