import { ImportEventRecord } from '../../../shared/types/models';
import { ImportFilterRange } from './adminTypes';

export function formatTimestamp(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export function formatRoleLabel(role: string) {
    return role.trim() || 'Viewer';
}

export async function copyToClipboard(value: string) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
}

export function getImportVariant(status: string): 'success' | 'danger' | 'secondary' {
    switch (status) {
        case 'Succeeded':
            return 'success';
        case 'Failed':
            return 'danger';
        default:
            return 'secondary';
    }
}

// The Admin import view stays useful over time by filtering events client-side
// into a small set of dashboard-friendly windows.
export function isImportWithinRange(importEvent: ImportEventRecord, range: ImportFilterRange) {
    if (range === 'all') {
        return true;
    }

    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const now = new Date();
    const createdAt = new Date(importEvent.createdAt);
    const ageInMilliseconds = now.getTime() - createdAt.getTime();
    const maxAgeInMilliseconds = days * 24 * 60 * 60 * 1000;
    return ageInMilliseconds <= maxAgeInMilliseconds;
}
