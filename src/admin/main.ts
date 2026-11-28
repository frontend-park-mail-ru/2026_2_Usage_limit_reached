import '@/styles/base.css';
import '@/styles/button.css';
import './admin.css';
import { ApiError } from '@/modules/api/apiError.ts';
import { initCsrfSync } from '@/modules/api/csrf.ts';
import { checkAdminAccess } from '@/modules/api/onlineConf.ts';
import { requireElement } from '@/utils/helpers/dom.ts';
import { ADMIN_ACCESS_CHECK_INTERVAL_MS, ADMIN_LIST_TABS, ADMIN_SCREENS } from './admin.constants.ts';
import type { AdminScreen } from './admin.types.ts';
import { initAdminLists } from './adminLists.ts';
import template from './admin.hbs';

const root = requireElement<HTMLElement>(document, '#admin-content');
let currentScreen: AdminScreen | undefined;
let pending: AbortController | undefined;
let stopLists: (() => void) | undefined;

function render(screen: AdminScreen): void {
  if (screen !== currentScreen) {
    stopLists?.();
    stopLists = undefined;
    currentScreen = screen;
    root.innerHTML = template({ ...ADMIN_SCREENS[screen], tabs: ADMIN_LIST_TABS });
    if (screen === 'authorized') {
      stopLists = initAdminLists(root, (nextScreen) => {
        pending?.abort();
        render(nextScreen);
      });
    }
  }
}

async function checkAccess(showLoading = false): Promise<void> {
  if (showLoading) {
    pending?.abort();
    render('loading');
  } else if (pending) {
    return;
  }
  const controller = new AbortController();
  pending = controller;
  try {
    await checkAdminAccess(controller.signal);
    if (!controller.signal.aborted) {
      render('authorized');
    }
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    if (error instanceof ApiError && error.isUnauthorized) {
      render('guest');
    } else if (error instanceof ApiError && error.status === 403) {
      render('forbidden');
    } else {
      render('error');
    }
  } finally {
    if (pending === controller) {
      pending = undefined;
    }
  }
}

root.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('[data-retry]')) {
    void checkAccess(true);
  }
});
const stopSessionSync = initCsrfSync(() => void checkAccess(true));
const timer = window.setInterval(() => {
  if (!document.hidden && currentScreen === 'authorized') {
    void checkAccess();
  }
}, ADMIN_ACCESS_CHECK_INTERVAL_MS);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    void checkAccess(true);
  }
});
window.addEventListener('pagehide', (event) => {
  pending?.abort();
  stopLists?.();
  stopLists = undefined;
  if (!event.persisted) {
    stopSessionSync();
    window.clearInterval(timer);
  }
});

void checkAccess(true);
