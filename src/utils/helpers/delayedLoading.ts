const DELAY = 200;
interface LoadingState {
  text: string;
  node: ChildNode | null;
  users: number;
  cancel: () => void;
}
const active = new Map<HTMLElement, LoadingState>();

/** Запускает задержку и сохраняет прежнюю подпись кнопки до показа новой. */
export function setLoadingText(element: HTMLElement, text: string, keepLabel = false): () => void {
  let state = active.get(element);
  if (state && state.text === text && state.node === element.firstChild) {
    state.users += 1;
  } else {
    state?.cancel();
    const previous = element.textContent ?? '';
    if (!keepLabel) {
      element.dataset.loadingDelay = text;
      element.removeAttribute('data-loading-visible');
      element.textContent = text;
    }
    const current: LoadingState = { text, node: element.firstChild, users: 1, cancel: () => {} };
    const timer = setTimeout(() => {
      if (element.isConnected && element.firstChild === current.node) {
        if (keepLabel) {
          element.textContent = text;
          current.node = element.firstChild;
        } else {
          element.setAttribute('data-loading-visible', '');
        }
      }
    }, DELAY);
    current.cancel = () => {
      clearTimeout(timer);
      if (active.get(element) !== current) {
        return;
      }
      active.delete(element);
      element.removeAttribute('data-loading-delay');
      element.removeAttribute('data-loading-visible');
      if (element.textContent === text) {
        element.textContent = keepLabel ? previous : '';
      }
    };
    active.set(element, current);
    state = current;
  }
  const current = state;
  let stopped = false;
  return () => {
    if (!stopped) {
      stopped = true;
      current.users -= 1;
      if (current.users === 0) {
        current.cancel();
      }
    }
  };
}

/** Подключает индикаторы только текущего загрузчика. */
export function startLoading(root: HTMLElement): () => void {
  const stops = [...root.querySelectorAll<HTMLElement>('[data-loading-delay]')]
    .map((element) => setLoadingText(element, element.dataset.loadingDelay ?? ''));
  return () => stops.forEach((stop) => stop());
}

/** Отменяет индикаторы при удалении страницы или компонента. */
export function cancelLoading(root: HTMLElement): void {
  for (const [element, state] of active) {
    if (root.contains(element) || !element.isConnected) {
      state.cancel();
    }
  }
}
