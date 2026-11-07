import donationsTemplate from './donations.hbs';
import donationCardTemplate from '@/components/donationCard/donationCard.hbs';
import { Modal } from '@/components/modal/modal.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { formatMoney } from '@/utils/helpers/money.ts';
import { formatPostDate } from '@/utils/helpers/posts.ts';
import { getReceivedDonations } from '@/modules/api/donations.ts';
import type { ReceivedDonation } from '@/modules/api/donations.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { ANONYMOUS_DONOR, LOADING_MESSAGE, LOAD_ERROR } from './donations.constants.ts';

/** Возвращает каркас страницы. */
export function renderDonations(): string {
  return donationsTemplate({});
}

/**
 * Данные карточки пожертвования.
 * @param donation
 */
function buildCard(donation: ReceivedDonation) {
  return {
    id: donation.id,
    name: donation.is_anonymous || !donation.donor ? ANONYMOUS_DONOR : donation.donor.username,
    paidAt: donation.paid_at,
    dateLabel: formatPostDate(donation.paid_at),
    amountLabel: formatMoney(donation.amount_minor, donation.currency),
    message: donation.message ?? '',
  };
}

/**
 * Показывает «Прочитать полностью» только у обрезанных сообщений.
 * @param list
 */
function updateMoreLinks(list: HTMLElement): void {
  for (const card of list.querySelectorAll<HTMLElement>('.donation-card')) {
    const text = card.querySelector<HTMLElement>('.donation-card__message');
    const button = card.querySelector<HTMLElement>('[data-donation-more]');
    if (text && button) {
      button.hidden = text.scrollWidth <= text.clientWidth;
    }
  }
}

/**
 * Подключает окно «Личное сообщение».
 * @param root
 * @param list
 * @param donations
 */
function bindMessageDialog(root: HTMLElement, list: HTMLElement, donations: Map<string, ReceivedDonation>): void {
  const dialog = requireElement<HTMLDialogElement>(root, '.donation-message');
  const modal = new Modal(dialog);
  list.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-donation-more]') : null;
    const id = button?.closest<HTMLElement>('.donation-card')?.dataset.donationId;
    const donation = id ? donations.get(id) : undefined;
    if (!donation) {
      return;
    }
    const card = buildCard(donation);
    requireElement(dialog, '[data-message-name]').textContent = card.name;
    const date = requireElement<HTMLTimeElement>(dialog, '[data-message-date]');
    date.dateTime = card.paidAt;
    date.textContent = card.dateLabel;
    requireElement(dialog, '[data-message-amount]').textContent = card.amountLabel;
    requireElement(dialog, '[data-message-text]').textContent = card.message;
    modal.open();
  });
}

/**
 * Загружает пожертвования страницами при прокрутке.
 * @param root
 */
export function initDonations(root: HTMLElement): void {
  const list = requireElement<HTMLElement>(root, '[data-donations-list]');
  const empty = requireElement<HTMLElement>(root, '[data-donations-empty]');
  const more = requireElement<HTMLElement>(root, '[data-donations-more]');
  const moreText = requireElement<HTMLElement>(more, '[data-donations-more-text]');
  const retry = requireElement<HTMLButtonElement>(more, '[data-donations-retry]');
  const donations = new Map<string, ReceivedDonation>();
  let cursor: string | null = null;
  let hasMore = true;
  let isLoading = false;

  const resizeObserver = new ResizeObserver(() => {
    if (list.isConnected) {
      updateMoreLinks(list);
    } else {
      resizeObserver.disconnect();
    }
  });

  const scrollObserver = new IntersectionObserver((entries) => {
    if (!list.isConnected) {
      scrollObserver.disconnect();
    } else if (entries.some((entry) => entry.isIntersecting)) {
      void loadPage();
    }
  }, { rootMargin: '200px' });

  async function loadPage(): Promise<void> {
    if (isLoading || !hasMore) {
      return;
    }
    isLoading = true;
    moreText.textContent = LOADING_MESSAGE;
    retry.hidden = true;
    try {
      const page = await getReceivedDonations(cursor);
      if (!list.isConnected) {
        return;
      }
      cursor = page.next_cursor;
      hasMore = !!cursor;
      for (const donation of page.items) {
        donations.set(donation.id, donation);
      }
      list.insertAdjacentHTML('beforeend', page.items.map((donation) => donationCardTemplate(buildCard(donation))).join(''));
      updateMoreLinks(list);
      empty.hidden = donations.size > 0;
      moreText.textContent = '';
      more.hidden = !hasMore;
      scrollObserver.unobserve(more);
      if (hasMore) {
        scrollObserver.observe(more);
      }
    } catch (err) {
      if (!(err instanceof ApiError)) {
        throw err;
      }
      if (!list.isConnected || err.status === 401) {
        return;
      }
      moreText.textContent = err.status === 0 ? err.text : LOAD_ERROR;
      retry.hidden = false;
    } finally {
      isLoading = false;
    }
  }

  retry.addEventListener('click', () => {
    void loadPage();
  });
  bindMessageDialog(root, list, donations);
  resizeObserver.observe(list);
  void loadPage();
}
