import type { AppStatus } from '../lib/types';

export const STATUS_META: Record<AppStatus, { label: string; color: string; soft: string }> = {
  wishlist: { label: 'Wishlist', color: '#8A84A0', soft: '#F1EFF6' },
  applied: { label: 'Applied', color: '#5B3DF5', soft: '#F3F0FF' },
  interview: { label: 'Interview', color: '#D98A00', soft: '#FFF6E5' },
  offer: { label: 'Offer', color: '#0F9D9A', soft: '#E6F7F6' },
  rejected: { label: 'Rejected', color: '#E2574A', soft: '#FFF1EF' },
};
