export type DonationCurrency = 'RUB';

export type DonationStatus = 'paid' | 'failed';

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

export interface DonationDonor {
  username: string;
  avatar_url?: string | null;
}

export interface ReceivedDonation {
  id: string;
  message: string | null;
  is_anonymous: boolean;
  amount_minor: number;
  currency: string;
  paid_at: string;
  donor?: DonationDonor | null;
}

export interface DonationsPage {
  items: ReceivedDonation[];
  next_cursor: string | null;
}
