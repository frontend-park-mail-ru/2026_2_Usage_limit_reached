import { AVATAR_PLACEHOLDER } from './profile.constants.ts';

/** Подставляет заглушку при ошибке загрузки отмеченного аватара, включая новые карточки. */
export function bindAvatarFallback(root: HTMLElement): () => void {
  const onError = (event: Event) => {
    const image = event.target;
    if (image instanceof HTMLImageElement && image.hasAttribute('data-avatar')
      && image.getAttribute('src') !== AVATAR_PLACEHOLDER) {
      image.src = AVATAR_PLACEHOLDER;
    }
  };
  root.addEventListener('error', onError, true);
  return () => root.removeEventListener('error', onError, true);
}
