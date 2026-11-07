/** Передаёт действия обработчикам по порядку. */
export class Dispatcher<Action> {
  private readonly handlers = new Set<(action: Action) => void>();
  private dispatching = false;

  /** Регистрирует обработчик и возвращает функцию его удаления. */
  register(handler: (action: Action) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /** Передаёт действие сразу, отправлять другое действие из обработчика нельзя. */
  dispatch(action: Action): void {
    if (this.dispatching) {
      throw new Error('Нельзя отправить действие во время обработки другого действия');
    }
    this.dispatching = true;
    try {
      for (const handler of this.handlers) {
        handler(action);
      }
    } finally {
      this.dispatching = false;
    }
  }
}
