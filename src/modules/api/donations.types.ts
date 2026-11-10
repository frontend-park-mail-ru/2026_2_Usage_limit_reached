export type DonationCurrency = 'RUB';

export type DonationStatus = 'paid' | 'failed';

export type DonationsDirection = 'received' | 'sent';

export interface DonationInput {
  request_key: string;
  amount_minor: number;
  currency: DonationCurrency;
  message: string | null;
  is_anonymous: boolean;
}

export interface DonationResult {
  id: string;
  status: DonationStatus;
}

export interface DonationUser {
  username: string;
  nickname: string;
  avatar_url: string | null;
}

export interface Donation {
  id: string;
  message: string | null;
  is_anonymous: boolean;
  amount_minor: number;
  currency: string;
  status: string;
  created_or_paid_at: string;
  user: DonationUser | null;
}

export interface DonationsPage {
  items: Donation[];
  next_cursor: string | null;
}
