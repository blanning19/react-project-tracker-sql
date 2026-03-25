import { useEffect, useState } from 'react';
import { formatDateTime } from '../../../shared/utils/date';

export function LiveClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    return (
        <div className="dashboard-clock rounded-4 px-3 py-2">
            <div className="fw-semibold">{formatDateTime(now)}</div>
        </div>
    );
}
