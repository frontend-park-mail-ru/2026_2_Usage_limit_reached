import { API_ERROR_MESSAGES, CSRF_ERROR_MESSAGE, CSRF_PREPARATION_ERROR, UNKNOWN_API_ERROR } from './request.constants.ts';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly source: 'api' | 'csrf';

  /** HTTP-статус ответа или 0, если ответ не получен. */
  constructor(status: number, code: string, source: 'api' | 'csrf' = 'api') {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.source = source;
  }

  /** Отличает отказ CSRF от обычного запрета доступа. */
  get isCsrfFailure(): boolean {
    return this.source === 'api' && this.status === 403 && this.code === 'csrf_failed';
  }

  /** Ошибка получения токена или отказ проверки перед выполнением действия. */
  get isCsrfError(): boolean {
    return this.source === 'csrf' || this.isCsrfFailure;
  }

  /** Ошибка подготовки запроса не подтверждает отсутствие сессии. */
  get isUnauthorized(): boolean {
    return this.source === 'api' && this.status === 401;
  }

  /** Сообщение для показа пользователю. */
  get text(): string {
    if (this.source === 'csrf') {
      return CSRF_PREPARATION_ERROR;
    }
    return this.isCsrfFailure ? CSRF_ERROR_MESSAGE : API_ERROR_MESSAGES[this.status] ?? UNKNOWN_API_ERROR;
  }
}
