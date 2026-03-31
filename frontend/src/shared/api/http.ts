const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

export function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers ?? {});
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    let response: Response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
        });
    } catch (error) {
        if (isAbortError(error)) {
            throw error;
        }

        const message =
            error instanceof Error && error.message
                ? `The backend is unavailable or a network problem occurred. ${error.message}`
                : 'The backend is unavailable or a network problem occurred.';
        throw new Error(message);
    }

    if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            const payload = (await response.json()) as { detail?: string };
            throw new Error(payload.detail || `Request failed with status ${response.status}`);
        }

        const message = await response.text();
        throw new Error(message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}
