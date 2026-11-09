import { Modal } from '@/components/modal/modal.ts';
import { requireElement } from '@/utils/helpers/dom.ts';

/** Показывает кнопку полного описания, когда превью обрезано. */
export function bindProfileBio(root: HTMLElement): (() => void) | undefined {
  const bio = root.querySelector<HTMLElement>('[data-profile-bio]');
  if (!bio) {
    return undefined;
  }
  const button = requireElement<HTMLButtonElement>(root, '[data-profile-bio-open]');
  const dialog = requireElement<HTMLDialogElement>(root, '.profile__bio-dialog');
  const modal = new Modal(dialog, () => {
    button.setAttribute('aria-expanded', 'false');
    (button.hidden ? bio : button).focus();
  });
  const update = () => {
    button.hidden = bio.scrollHeight <= bio.clientHeight;
  };
  const open = () => {
    modal.open();
    button.setAttribute('aria-expanded', 'true');
  };
  const observer = new ResizeObserver(update);
  observer.observe(bio);
  update();
  button.addEventListener('click', open);
  return () => {
    observer.disconnect();
    button.removeEventListener('click', open);
    modal.destroy();
  };
}
