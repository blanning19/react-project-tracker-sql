import { isTaskAssignedToUser, normalizeAssigneeName, parseAssigneeNames } from './assignees';

describe('assignee helpers', () => {
    it('parses comma-separated assignee names into trimmed entries', () => {
        expect(parseAssigneeNames(' Ava Patel, Brad Lanning , ,Morgan Chen ')).toEqual([
            'Ava Patel',
            'Brad Lanning',
            'Morgan Chen',
        ]);
    });

    it('normalizes names for case-insensitive exact comparison', () => {
        expect(normalizeAssigneeName('  Ava Patel ')).toBe('ava patel');
    });

    it('matches full assignee names without substring false positives', () => {
        expect(isTaskAssignedToUser('Joann Rivera, Ava Patel', 'Ann')).toBe(false);
        expect(isTaskAssignedToUser('Joann Rivera, Ava Patel', 'Ava Patel')).toBe(true);
    });
});
