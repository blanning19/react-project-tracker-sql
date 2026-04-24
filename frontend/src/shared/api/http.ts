import { logger } from '../utils/debug';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api';

export function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers ?? {});
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const method = options.method ?? 'GET';
    if (!isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    logger.debug('HTTP', 'Starting API request', { method, path });

    let response: Response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
        });
    } catch (error) {
        if (isAbortError(error)) {
            logger.debug('HTTP', 'API request aborted', { method, path });
            throw error;
        }

        const message =
            error instanceof Error && error.message
                ? `The backend is unavailable or a network problem occurred. ${error.message}`
                : 'The backend is unavailable or a network problem occurred.';
        logger.error('HTTP', 'API request failed before receiving a response', { method, path, message });
        throw new Error(message);
    }

    if (!response.ok) {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            const payload = (await response.json()) as { detail?: string };
            logger.error('HTTP', 'API request returned a JSON error response', {
                method,
                path,
                status: response.status,
                detail: payload.detail ?? null,
            });
            throw new Error(payload.detail || `Request failed with status ${response.status}`);
        }

        const message = await response.text();
        logger.error('HTTP', 'API request returned a text error response', {
            method,
            path,
            status: response.status,
            message,
        });
        throw new Error(message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        logger.success('HTTP', 'API request completed with no content', { method, path, status: response.status });
        return undefined as T;
    }

    logger.success('HTTP', 'API request completed successfully', { method, path, status: response.status });
    return response.json() as Promise<T>;
}
