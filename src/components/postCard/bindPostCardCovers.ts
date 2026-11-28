/** Возвращает обычное превью, если обложка не загрузилась, в том числе после подгрузки карточек. */
export function bindPostCardCovers(root: HTMLElement): () => void {
  const onError = (event: Event) => {
    const image = event.target;
    if (image instanceof HTMLImageElement && image.matches('.post-card__cover')) {
      image.remove();
    }
  };
  root.addEventListener('error', onError, true);
  return () => root.removeEventListener('error', onError, true);
}
