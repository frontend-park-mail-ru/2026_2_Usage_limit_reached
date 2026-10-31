/**
 * Находит обязательный элемент, если его нет, выбрасывает ошибку.
 * @param root
 * @param selector
 * @throws {Error}
 */
export function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Не найден элемент ${selector}`);
  }
  return element;
}
