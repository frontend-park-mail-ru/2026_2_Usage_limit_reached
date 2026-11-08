import '@/styles/main.css';
import { initRouter } from '@/app/router.ts';
import { registerServiceWorker } from '@/app/registerServiceWorker.ts';
import { initRefreshNotice } from '@/components/refreshNotice/refreshNotice.ts';
import { initCsrfSync } from '@/modules/api/csrf.ts';
import { invalidateSessionMemory } from '@/modules/auth/auth.actions.ts';
import { initOfflineSync } from '@/modules/offline/offline.storage.ts';
import { requireElement } from '@/utils/helpers/dom.ts';

const refreshNotice = initRefreshNotice(requireElement<HTMLElement>(document, '#refresh-notice'));
const stopOfflineSync = initOfflineSync(invalidateSessionMemory);
const stopCsrfSync = initCsrfSync(invalidateSessionMemory);
const stopRouter = initRouter(refreshNotice.update);

window.addEventListener('pagehide', (event) => {
  if (event.persisted) {
    return;
  }
  stopOfflineSync();
  stopCsrfSync();
  stopRouter();
  refreshNotice.destroy();
});

void registerServiceWorker();
