export function getStatusClass(status: string) {
    switch (status.toLowerCase()) {
        case 'completed':
            return 'success';
        case 'on track':
            return 'primary';
        case 'at risk':
            return 'warning';
        case 'blocked':
            return 'dark';
        case 'not started':
            return 'secondary';
        case 'in progress':
            return 'info';
        default:
            return 'secondary';
    }
}
