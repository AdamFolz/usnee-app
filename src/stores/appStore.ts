import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSettings, AppScreen, ConsumptionEntry, TimerState, LastRecordContext } from '../types';
import { getLastEntry, getEntries } from '../utils/db';

interface AppState {
  // Auth
  unlocked: boolean;
  setUnlocked: (v: boolean) => void;

  // PIN brute-force protection (SEC-002)
  pinAttempts: number;
  pinLockedUntil: number;
  registerPinFailure: () => void;
  resetPinAttempts: () => void;

  // Navigation
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;

  // Settings
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;

  // Entries cache
  lastEntry: ConsumptionEntry | null;
  todayCount: number;
  refreshEntries: () => Promise<void>;
  lastRecordContext: LastRecordContext | null;
  setLastRecordContext: (context: LastRecordContext | null) => void;

  // Timers
  timers: TimerState[];
  addTimer: (t: TimerState) => void;
  removeTimer: (id: string) => void;

  // Onboarding
  showOnboarding: boolean;
  dismissOnboarding: () => void;

  // Panic
  panic: () => void;
}

const defaultSettings: UserSettings = {
  darkTheme: true,
  notifications: false,
  reminderEat: false,
  reminderWater: false,
  reminderBreak: false,
  language: 'ru',
  onboardingCompleted: false
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      unlocked: false,
      setUnlocked: (v) => set({ unlocked: v }),

      pinAttempts: 0,
      pinLockedUntil: 0,
      registerPinFailure: () => {
        const attempts = get().pinAttempts + 1;
        // Backoff ladder: 1s -> 2s -> 5s -> 15s -> wipe (5th failure)
        const delays = [1000, 2000, 5000, 15000];
        const lockUntil = attempts <= delays.length ? Date.now() + delays[attempts - 1] : 0;
        set({ pinAttempts: attempts, pinLockedUntil: lockUntil });
      },
      resetPinAttempts: () => set({ pinAttempts: 0, pinLockedUntil: 0 }),

      screen: 'home',
      setScreen: (s) => set({ screen: s }),

      settings: defaultSettings,
      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),

      lastEntry: null,
      todayCount: 0,
      lastRecordContext: null,
      setLastRecordContext: (context) => set({ lastRecordContext: context }),
      refreshEntries: async () => {
        const last = await getLastEntry();
        const all = await getEntries();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const today = all.filter((e) => e.timestamp >= startOfDay.getTime());
        set({ lastEntry: last || null, todayCount: today.length });
      },

      timers: [],
      addTimer: (t) => set((state) => ({ timers: [...state.timers, t] })),
      removeTimer: (id) =>
        set((state) => ({ timers: state.timers.filter((t) => t.id !== id) })),

      showOnboarding: false,
      dismissOnboarding: () => {
        set({ showOnboarding: false });
        get().updateSettings({ onboardingCompleted: true });
      },

      panic: () => {
        const tw = (window as any).Telegram?.WebApp;
        if (tw?.close) {
          tw.close();
        } else {
          window.location.href = 'https://google.com';
        }
      }
    }),
    {
      name: 'usnee-app-store',
      partialize: (state) => ({
        settings: state.settings,
        showOnboarding: state.showOnboarding,
        lastRecordContext: state.lastRecordContext,
        timers: state.timers,
        pinAttempts: state.pinAttempts,
        pinLockedUntil: state.pinLockedUntil
      })
    }
  )
);
