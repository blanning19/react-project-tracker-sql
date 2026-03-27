import { apiFetch } from './http';

describe('apiFetch', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('surfaces backend detail messages from JSON errors', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ detail: 'Project not found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            }),
        );

        await expect(apiFetch('/projects/123')).rejects.toThrow('Project not found.');
    });

    it('turns network failures into a friendlier error', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch'));

        await expect(apiFetch('/projects')).rejects.toThrow(
            'The backend is unavailable or a network problem occurred. Failed to fetch',
        );
    });
});
