import { render, screen, waitFor } from '@testing-library/react';
import { ProjectForm } from './ProjectForm';
import { apiFetch } from '../../../shared/api/http';

vi.mock('../../../shared/api/http', () => ({
    apiFetch: vi.fn().mockResolvedValue([]),
    isAbortError: vi.fn().mockReturnValue(false),
}));

describe('ProjectForm', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('starts manual projects with a blank source file and a 90-day finish date', async () => {
        const expectedStartDate = new Date().toISOString().slice(0, 10);
        const expectedFinishDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        render(<ProjectForm project={null} onSave={vi.fn().mockResolvedValue({})} onClear={vi.fn()} />);

        await waitFor(() => {
            expect(apiFetch).toHaveBeenCalledWith('/managers', { signal: expect.any(AbortSignal) });
        });

        const sourceFileInput = screen.getByPlaceholderText('Not imported from a file');
        expect(sourceFileInput).toHaveValue('');
        expect(sourceFileInput).toHaveAttribute('placeholder', 'Not imported from a file');
        expect(screen.getByDisplayValue(expectedStartDate)).toBeInTheDocument();
        expect(screen.getByDisplayValue(expectedFinishDate)).toBeInTheDocument();
    });
});
