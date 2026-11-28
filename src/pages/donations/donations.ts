import { setLoadingText, cancelLoading } from '@/utils/helpers/delayedLoading.ts';
import donationsTemplate from './donations.hbs';
import donationCardTemplate from '@/components/donationCard/donationCard.hbs';
import { Modal } from '@/components/modal/modal.ts';
import { Tabs } from '@/components/tabs/tabs.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { formatMoney } from '@/utils/helpers/money.ts';
import { formatPostDate } from '@/utils/helpers/posts.ts';
import { checkSession, getSessionContext, getSessionVersion, runSessionRequest } from '@/modules/auth/auth.actions.ts';
import { authStore } from '@/modules/auth/auth.store.ts';
import { captureOfflineToken, readOfflineCopy } from '@/modules/offline/offline.storage.ts';
import { loadOfflineDonations } from '@/modules/offline/offline.pages.ts';
import { bindOfflineRecovery, isBackendUnavailable } from '@/modules/offline/offline.recovery.ts';
import { getDonations } from '@/modules/api/donations.ts';
import type { Donation, DonationsDirection } from '@/modules/api/donations.types.ts';
import { ApiError } from '@/modules/api/request.ts';
import type { Navigate } from '@/app/paths.ts';
import type { RouteParams } from '@/app/router.types.ts';
import type { SetRefreshNotice } from '@/components/refreshNotice/refreshNotice.types.ts';
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
    createdAt: donation.created_at,
    dateLabel: formatPostDate(donation.created_at),
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
 * Показывает «Показать полностью» только у обрезанных сообщений.
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
function bindMessageDialog(root: HTMLElement, list: HTMLElement, donations: Map<string, Donation>): () => void {
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
    date.dateTime = card.createdAt;
    date.textContent = card.dateLabel;
    requireElement(dialog, '[data-message-amount]').textContent = card.amountLabel;
    requireElement(dialog, '[data-message-text]').textContent = card.message;
    modal.open();
  });
  return () => modal.destroy();
}

/**
 * Показывает полученные или отправленные пожертвования и подгружает их при прокрутке.
 * @param root
 */
export function initDonations(root: HTMLElement, _navigate: Navigate, _params: RouteParams, setRefreshNotice: SetRefreshNotice): () => void {
  const toolbar = requireElement<HTMLElement>(root, '[data-donations-toolbar]');
  const panel = requireElement<HTMLElement>(root, '[data-donations-panel]');
  const list = requireElement<HTMLElement>(root, '[data-donations-list]');
  const empty = requireElement<HTMLElement>(root, '[data-donations-empty]');
  const more = requireElement<HTMLElement>(root, '[data-donations-more]');
  const moreText = requireElement<HTMLElement>(more, '[data-donations-more-text]');
  const donations = new Map<string, Donation>();
  let direction: DonationsDirection | undefined;
  let tabs: Tabs | undefined;
  let cursor: string | null = null;
  let hasMore = true;
  let isLoading = false;
  let listVersion = 0;
  let active = true;
  let ownerId: string | undefined;
  let sessionVersion = getSessionVersion();
  let startRequest = 0;
  let starting = false;
  let needsRetry = false;
  let recoverAfterLoad = false;
  let retryAction: (() => void) | undefined;
  const updateNotice = () => setRefreshNotice(retryAction ? { pending: starting || isLoading } : null, retryAction);
  const isCurrent = (version: number) => active && list.isConnected && version === listVersion && sessionVersion === getSessionVersion();

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
    retryAction = () => { void (direction && hasMore ? loadPage() : start()); };
    updateNotice();
  };

  const resetList = (keepLoading = false) => {
    if (!keepLoading) {
      cancelLoading(more);
    }
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

  function showDirection(next: DonationsDirection, keepLoading = false): Promise<void> {
    direction = next;
    resetList(keepLoading);
    showDirectionTexts(root, next);
    return loadPage();
  }

  async function loadPage(): Promise<void> {
    if (!active || !ownerId || !direction || isLoading || !hasMore) {
      return;
    }
    const version = listVersion;
    isLoading = true;
    const stopLoading = setLoadingText(moreText, LOADING_MESSAGE);
    updateNotice();
    try {
      const context = getSessionContext();
      const currentDirection = direction;
      const currentCursor = cursor;
      const page = await loadOfflineDonations(ownerId, direction, cursor, async () => {
        if (!context || context.userId !== ownerId || !isCurrent(version)) {
          throw new ApiError(0, 'session_unconfirmed');
        }
        const result = await runSessionRequest(context, () => getDonations(currentDirection, currentCursor));
        if (!result) {
          throw new ApiError(0, 'stale_session');
        }
        return result;
      }, () => isCurrent(version));
      if (!isCurrent(version)) {
        return;
      }
      cursor = page.next_cursor;
      hasMore = !!cursor;
      needsRetry = page.savedAt !== undefined;
      retryAction = needsRetry ? () => { void start(); } : undefined;
      const items = page.items.filter((item) => !donations.has(item.id));
      for (const donation of items) {
        donations.set(donation.id, donation);
      }
      list.insertAdjacentHTML('beforeend', items.map((donation) => donationCardTemplate(buildCard(donation))).join(''));
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
      if (!isCurrent(version) || err.isUnauthorized) {
        return;
      }
      if (err.status === 403 || err.status === 404) {
        donations.clear();
        list.replaceChildren();
        empty.hidden = true;
        hasMore = false;
        root.querySelector<HTMLDialogElement>('.donation-message')?.close();
      }
      needsRetry = isBackendUnavailable(err);
      showError(donations.size > 0 ? 'Не удалось загрузить ещё пожертвования' : 'Не удалось загрузить пожертвования');
    } finally {
      stopLoading();
      if (version === listVersion) {
        isLoading = false;
        updateNotice();
        if (recoverAfterLoad && !starting) {
          recoverAfterLoad = false;
          if (needsRetry) {
            void start();
          }
        }
      }
    }
  }

  async function start(): Promise<void> {
    const wantedDirection = direction;
    direction = undefined;
    const id = ++startRequest;
    const version = getSessionVersion();
    starting = true;
    resetList();
    tabs?.destroy();
    tabs = undefined;
    toolbar.hidden = true;
    root.querySelector<HTMLDialogElement>('.donation-message')?.close();
    const stopLoading = setLoadingText(moreText, LOADING_MESSAGE);
    updateNotice();
    try {
      let profile;
      try {
        profile = await checkSession();
      } catch (error) {
        if (!isBackendUnavailable(error)) {
          throw error;
        }
        const copy = await readOfflineCopy(ownerId);
        const token = await captureOfflineToken();
        profile = copy && copy.generation === token?.generation ? copy.profile : undefined;
      }
      if (!active || id !== startRequest || version !== getSessionVersion()) {
        return;
      }
      if (!profile) {
        needsRetry = true;
        showError(LOAD_ERROR);
        return;
      }
      ownerId = profile.user.id;
      sessionVersion = getSessionVersion();
      panel.removeAttribute('role');
      panel.removeAttribute('aria-labelledby');
      const nextDirection = profile.author ? wantedDirection ?? 'received' : 'sent';
      toolbar.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach((button) => {
        button.setAttribute('aria-selected', String(button.dataset.tab === nextDirection));
        button.tabIndex = button.dataset.tab === nextDirection ? 0 : -1;
      });
      if (profile.author) {
        toolbar.hidden = false;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', `donations-tabs-tab-${nextDirection}`);
        tabs = new Tabs(requireElement<HTMLElement>(toolbar, '.tabs'), (value) => {
          const next = value === 'sent' ? 'sent' : 'received';
          panel.setAttribute('aria-labelledby', `donations-tabs-tab-${next}`);
          showDirection(next);
        });
      }
      await showDirection(nextDirection, true);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        throw err;
      }
      if (!active || id !== startRequest || version !== getSessionVersion() || err.isUnauthorized) {
        return;
      }
      needsRetry = isBackendUnavailable(err);
      showError(err.status === 0 ? err.text : LOAD_ERROR);
    } finally {
      stopLoading();
      if (id === startRequest) {
        starting = false;
        updateNotice();
        if (recoverAfterLoad) {
          recoverAfterLoad = false;
          if (needsRetry) {
            void start();
          }
        }
      }
    }
  }

  const disposeMessage = bindMessageDialog(root, list, donations);
  const unbindRecovery = bindOfflineRecovery(() => {
    if (starting || isLoading) {
      recoverAfterLoad = true;
    } else {
      void start();
    }
  }, () => active && needsRetry && !root.querySelector('dialog[open]'));
  let previous = authStore.getState();
  let previousVersion = getSessionVersion();
  const unsubscribe = authStore.subscribe(() => {
    const current = authStore.getState();
    const changed = current.status === 'unknown' || previousVersion !== getSessionVersion() || (previous.status !== 'unknown'
      && (current.status !== previous.status || current.user?.id !== previous.user?.id));
    previous = current;
    previousVersion = getSessionVersion();
    if (changed) {
      ownerId = undefined;
      direction = undefined;
      void start();
    }
  });
  resizeObserver.observe(list);
  void start();
  return () => {
    active = false;
    setRefreshNotice(null);
    startRequest += 1;
    unsubscribe();
    unbindRecovery();
    disposeMessage();
    cancelLoading(root);
    listVersion += 1;
    tabs?.destroy();
    scrollObserver.disconnect();
    resizeObserver.disconnect();
  };
}
