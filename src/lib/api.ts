export const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

const buildUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error: ApiError = new Error(
      data?.message || response.statusText || "Request failed"
    );
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

export const apiFetch = async <T>(path: string, options: RequestInit = {}) => {
  const url = buildUrl(path);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  } as HeadersInit;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return parseResponse<T>(response);
};

export const getJson = async <T>(path: string) => {
  return apiFetch<T>(path, { method: "GET" });
};

export const postJson = async <T>(path: string, body: unknown) => {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
};

export const putJson = async <T>(path: string, body: unknown) => {
  return apiFetch<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
};

export const deleteJson = async <T>(path: string) => {
  return apiFetch<T>(path, { method: "DELETE" });
};
