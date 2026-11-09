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

  /** Запрос изменения был прерван по тайм-ауту. */
  get isMutationTimeout(): boolean {
    return this.source === 'api' && this.code === 'mutation_timeout'
      && (this.status === 0 || (this.status >= 200 && this.status < 300));
  }

  /** Сервер вернул успешный статус, но тело ответа не загрузилось вовремя. */
  get isMutationResponseTimeout(): boolean {
    return this.isMutationTimeout && this.status !== 0;
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
    if (this.isMutationTimeout) {
      return this.status === 0
        ? 'Сервер не ответил вовремя. Проверьте, выполнилось ли действие, прежде чем повторять его'
        : 'Сервер принял запрос, но ответ не загрузился полностью. Обновите страницу и проверьте результат';
    }
    return this.isCsrfFailure ? CSRF_ERROR_MESSAGE : API_ERROR_MESSAGES[this.status] ?? UNKNOWN_API_ERROR;
  }
}
