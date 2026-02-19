// fetchClient.js

const baseUrl = "http://127.0.0.1:8000/";

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, cancel: () => clearTimeout(id) };
}

async function request(path, { method = "GET", headers = {}, body, timeout = 5000 } = {}) {
  const { controller, cancel } = withTimeout(timeout);

  try {
    const res = await fetch(new URL(path, baseUrl), {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      body,
    });

    // Axios parses JSON into `data` — we'll do the same.
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    // Axios rejects on non-2xx — fetch does not, so we enforce that here.
    if (!res.ok) {
      const err = new Error(`Request failed with status ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    // Optional: return axios-like shape if you want
    return {
      data,
      status: res.status,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries()),
    };
  } catch (err) {
    // Normalize timeout/cancel error similar-ish to axios timeout behavior
    if (err.name === "AbortError") {
      const timeoutErr = new Error(`Request timed out after ${timeout}ms`);
      timeoutErr.code = "ECONNABORTED";
      throw timeoutErr;
    }
    throw err;
  } finally {
    cancel();
  }
}

const FetchInstance = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),

  post: (path, data, options) =>
    request(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    }),

  put: (path, data, options) =>
    request(path, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    }),

  patch: (path, data, options) =>
    request(path, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

export default FetchInstance;
