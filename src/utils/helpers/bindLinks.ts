export function bindLinks(container: HTMLElement, navigate: (path: string) => void): void {
  container.querySelectorAll('a[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const href = link.getAttribute('href');
      if (href) navigate(href);
    });
  });
}
