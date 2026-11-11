import type { DonationsDirection } from '@/modules/api/donations.types.ts';
import type { DonationsTabItem, DonationsTexts } from './donations.types.ts';

export const LOADING_MESSAGE = 'Загрузка пожертвований...';
export const LOAD_ERROR = 'Не удалось загрузить пожертвования. Попробуйте позже';
export const ANONYMOUS_DONOR = 'Аноним';

export const DONATIONS_TABS: DonationsTabItem[] = [
  { value: 'received', label: 'Полученные' },
  { value: 'sent', label: 'Отправленные' },
];

export const DONATIONS_TEXTS: Readonly<Record<DonationsDirection, DonationsTexts>> = {
  received: {
    subtitle: 'Пожертвования читателей и личные сообщения для вас',
    emptyTitle: 'Пока нет пожертвований',
    emptyText: 'Пожертвования и сообщения читателей появятся здесь',
  },
  sent: {
    subtitle: 'Ваши пожертвования авторам и сообщения к ним',
    emptyTitle: 'Вы ещё не отправляли пожертвований',
    emptyText: 'Пожертвования, которые вы отправите авторам, появятся здесь',
  },
};
