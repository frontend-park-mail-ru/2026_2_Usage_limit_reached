import { requireElement } from '../../utils/helpers/dom.ts';
import type { PostLikes } from '../../modules/api/posts.types.ts';

/** Кнопка лайка */
export class LikeButton {
  private readonly button: HTMLButtonElement;
  private readonly count: HTMLElement;
  private readonly onToggle: (liked: boolean) => Promise<PostLikes | null>;
  private state: PostLikes;
  private pending = false;

  /**
   * @param button
   * @param state
   * @param onToggle
   */
  constructor(button: HTMLButtonElement, state: PostLikes, onToggle: (liked: boolean) => Promise<PostLikes | null>) {
    this.button = button;
    this.count = requireElement<HTMLElement>(button, '.like-button__count');
    this.state = state;
    this.onToggle = onToggle;
    this.button.addEventListener('click', () => {
      void this.toggle();
    });
  }

  /** Переключает лайк. */
  private async toggle(): Promise<void> {
    if (this.pending) {
      return;
    }
    const previous = this.state;
    const liked = !previous.liked_by_user;
    let result: PostLikes | null = null;
    this.pending = true;
    this.render({ likes_count: previous.likes_count + (liked ? 1 : -1), liked_by_user: liked });
    try {
      result = await this.onToggle(liked);
    } finally {
      this.pending = false;
      this.render(result ?? previous);
    }
  }

  /**
   * Показывает состояние.
   * @param state
   */
  private render(state: PostLikes): void {
    this.state = state;
    this.button.classList.toggle('like-button_liked', state.liked_by_user);
    this.button.setAttribute('aria-pressed', String(state.liked_by_user));
    this.button.setAttribute('aria-label', `Нравится. Лайков: ${state.likes_count}`);
    this.count.textContent = String(state.likes_count);
  }
}
