import { API_BASE_URL } from './config.js';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  data?: object;
}

export const request = async <T>(path: string, { method = 'GET', data }: RequestOptions = {}): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: data ? { 'Content-Type': 'application/json' } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network error');
  }

  const json: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const { error } = json as { error?: string };
    throw new ApiError(response.status, error ?? 'unknown error');
  }
  return json as T;
};
