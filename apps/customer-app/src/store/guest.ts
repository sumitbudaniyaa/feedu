import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Remembered guest details (set at checkout) so rewards/orders auto-load. */
interface GuestState {
  name: string;
  phone: string;
  save: (name: string, phone: string) => void;
  clear: () => void;
}

export const useGuest = create<GuestState>()(
  persist(
    (set) => ({
      name: '',
      phone: '',
      save: (name, phone) => set({ name, phone }),
      clear: () => set({ name: '', phone: '' }),
    }),
    { name: 'feedo-guest' },
  ),
);
