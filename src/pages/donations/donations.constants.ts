import type { DonationsDirection } from '@/modules/api/donations.types.ts';
import type { DonationsTabItem, DonationsTexts } from './donations.types.ts';

export const LOADING_MESSAGE = 'Загрузка пожертвований...';
export const LOAD_ERROR = 'Не удалось загрузить пожертвования. Попробуйте позже';
export const ANONYMOUS_DONOR = 'Аноним';
export const DONATION_STATUSES: Readonly<Record<string, string>> = {
  paid: 'Отправлено',
  pending: 'В обработке',
  processing: 'В обработке',
  failed: 'Не отправлено',
  canceled: 'Отменено',
};

export const DONATIONS_TABS: DonationsTabItem[] = [
  { value: 'received', label: 'Полученные' },
  { value: 'sent', label: 'Отправленные' },
];

export const DONATIONS_TEXTS: Readonly<Record<DonationsDirection, DonationsTexts>> = {
  received: {
    subtitle: 'Пожертвования от читателей и сообщения к ним',
    emptyTitle: 'Пока нет пожертвований',
    emptyText: 'Здесь появятся пожертвования и сообщения к ним',
  },
  sent: {
    subtitle: 'Ваши пожертвования авторам и сообщения к ним',
    emptyTitle: 'Вы ещё не отправляли пожертвований',
    emptyText: 'Здесь появятся ваши пожертвования авторам',
  },
};
