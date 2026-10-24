export function bindLinks(container: HTMLElement, navigate: (path: string) => void): void {
  container.querySelectorAll<HTMLAnchorElement>('a[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0
        || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

      const href = link.getAttribute('href');
      if (!href) return;

      event.preventDefault();
      navigate(href);
    });
  });
}
