import type { DonationsDirection } from '@/modules/api/donations.types.ts';

export interface DonationsTabItem {
  value: DonationsDirection;
  label: string;
}

export interface DonationsTexts {
  subtitle: string;
  emptyTitle: string;
  emptyText: string;
}
