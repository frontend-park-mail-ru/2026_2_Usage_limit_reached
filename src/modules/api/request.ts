import { API_BASE_URL } from './config.js';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  data?: object;
  responseType?: 'json' | 'empty';
};

export const request = async <T>(path: string, { method = 'GET', data, responseType = 'json' }: RequestOptions = {}): Promise<T> => {
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

  if (response.ok && responseType === 'empty') return undefined as T;

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(response.status, response.ok ? 'invalid JSON response' : 'unknown error');
  }

  if (!response.ok) {
    const message = typeof json === 'object' && json !== null
      && 'error' in json && typeof json.error === 'string' ? json.error : 'unknown error';
    throw new ApiError(response.status, message);
  }
  return json as T;
};
