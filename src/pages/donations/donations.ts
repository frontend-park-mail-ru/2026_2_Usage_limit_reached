import donationsTemplate from './donations.hbs';
import donationCardTemplate from '@/components/donationCard/donationCard.hbs';
import { Modal } from '@/components/modal/modal.ts';
import { Tabs } from '@/components/tabs/tabs.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { formatMoney } from '@/utils/helpers/money.ts';
import { formatPostDate } from '@/utils/helpers/posts.ts';
import { checkSession } from '@/modules/auth/auth.actions.ts';
import { getDonations } from '@/modules/api/donations.ts';
import type { Donation, DonationsDirection } from '@/modules/api/donations.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import { ANONYMOUS_DONOR, DONATIONS_TABS, DONATIONS_TEXTS, LOADING_MESSAGE, LOAD_ERROR } from './donations.constants.ts';

/** Возвращает каркас страницы. */
export function renderDonations(): string {
  return donationsTemplate({
    tabs: DONATIONS_TABS.map((item, index) => ({ ...item, selected: index === 0 })),
  });
}

/**
 * Данные карточки пожертвования.
 * @param donation
 */
function buildCard(donation: Donation) {
  return {
    id: donation.id,
    name: donation.is_anonymous || !donation.user ? ANONYMOUS_DONOR : donation.user.nickname,
    paidAt: donation.created_or_paid_at,
    dateLabel: formatPostDate(donation.created_or_paid_at),
    amountLabel: formatMoney(donation.amount_minor, donation.currency),
    message: donation.message ?? '',
  };
}

/**
 * Подставляет подзаголовок и тексты пустого состояния выбранного списка.
 * @param root
 * @param direction
 */
function showDirectionTexts(root: HTMLElement, direction: DonationsDirection): void {
  const texts = DONATIONS_TEXTS[direction];
  requireElement(root, '[data-donations-subtitle]').textContent = texts.subtitle;
  requireElement(root, '[data-donations-empty-title]').textContent = texts.emptyTitle;
  requireElement(root, '[data-donations-empty-text]').textContent = texts.emptyText;
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
      button.hidden = text.scrollWidth <= text.clientWidth && !text.textContent?.includes('\n');
    }
  }
}

/**
 * Подключает окно «Личное сообщение».
 * @param root
 * @param list
 * @param donations
 */
function bindMessageDialog(root: HTMLElement, list: HTMLElement, donations: Map<string, Donation>): void {
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
 * Показывает полученные или отправленные пожертвования и подгружает их при прокрутке.
 * @param root
 */
export function initDonations(root: HTMLElement): () => void {
  const toolbar = requireElement<HTMLElement>(root, '[data-donations-toolbar]');
  const panel = requireElement<HTMLElement>(root, '[data-donations-panel]');
  const list = requireElement<HTMLElement>(root, '[data-donations-list]');
  const empty = requireElement<HTMLElement>(root, '[data-donations-empty]');
  const more = requireElement<HTMLElement>(root, '[data-donations-more]');
  const moreText = requireElement<HTMLElement>(more, '[data-donations-more-text]');
  const retry = requireElement<HTMLButtonElement>(more, '[data-donations-retry]');
  const donations = new Map<string, Donation>();
  let direction: DonationsDirection | undefined;
  let tabs: Tabs | undefined;
  let cursor: string | null = null;
  let hasMore = true;
  let isLoading = false;
  let listVersion = 0;

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

  const showError = (text: string) => {
    moreText.textContent = text;
    retry.hidden = false;
  };

  const resetList = () => {
    listVersion += 1;
    isLoading = false;
    cursor = null;
    hasMore = true;
    donations.clear();
    list.replaceChildren();
    scrollObserver.unobserve(more);
    empty.hidden = true;
    more.hidden = false;
  };

  function showDirection(next: DonationsDirection): void {
    direction = next;
    resetList();
    showDirectionTexts(root, next);
    void loadPage();
  }

  async function loadPage(): Promise<void> {
    if (!direction || isLoading || !hasMore) {
      return;
    }
    const version = listVersion;
    isLoading = true;
    moreText.textContent = LOADING_MESSAGE;
    retry.hidden = true;
    try {
      const page = await getDonations(direction, cursor);
      if (!list.isConnected || version !== listVersion) {
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
      if (!list.isConnected || version !== listVersion || err.status === 401) {
        return;
      }
      showError(err.status === 0 ? err.text : LOAD_ERROR);
    } finally {
      if (version === listVersion) {
        isLoading = false;
      }
    }
  }

  async function start(): Promise<void> {
    moreText.textContent = LOADING_MESSAGE;
    retry.hidden = true;
    try {
      const profile = await checkSession();
      if (!list.isConnected) {
        return;
      }
      if (!profile) {
        showError(LOAD_ERROR);
        return;
      }
      if (profile.author) {
        toolbar.hidden = false;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', 'donations-tabs-tab-received');
        tabs = new Tabs(requireElement<HTMLElement>(toolbar, '.tabs'), (value) => {
          const next = value === 'sent' ? 'sent' : 'received';
          panel.setAttribute('aria-labelledby', `donations-tabs-tab-${next}`);
          showDirection(next);
        });
      }
      showDirection(profile.author ? 'received' : 'sent');
    } catch (err) {
      if (!(err instanceof ApiError)) {
        throw err;
      }
      if (!list.isConnected || err.status === 401) {
        return;
      }
      showError(err.status === 0 ? err.text : LOAD_ERROR);
    }
  }

  retry.addEventListener('click', () => {
    void (direction ? loadPage() : start());
  });
  bindMessageDialog(root, list, donations);
  resizeObserver.observe(list);
  void start();
  return () => {
    listVersion += 1;
    tabs?.destroy();
    scrollObserver.disconnect();
    resizeObserver.disconnect();
  };
}
