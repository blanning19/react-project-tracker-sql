export function parseAssigneeNames(resourceNames: string): string[] {
    return resourceNames
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);
}

export function normalizeAssigneeName(name: string): string {
    return name.trim().toLowerCase();
}

export function isTaskAssignedToUser(resourceNames: string, userName: string): boolean {
    const normalizedUserName = normalizeAssigneeName(userName);

    if (!normalizedUserName) {
        return false;
    }

    return parseAssigneeNames(resourceNames).some((name) => normalizeAssigneeName(name) === normalizedUserName);
}
