import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import { initDB } from './utils/db';
import { hashPin } from './utils/crypto';
import { Layout } from './components/Layout';
import { PinLock } from './components/PinLock';
import { Onboarding } from './components/Onboarding';
import Home from './pages/Home';
import AddEntry from './pages/AddEntry';
import { History } from './pages/History';
import { Stats } from './pages/Stats';
import { Calendar } from './pages/Calendar';
import { Safety } from './pages/Safety';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { Partials } from './pages/Partials';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const unlocked = useAppStore((s) => s.unlocked);
  const setUnlocked = useAppStore((s) => s.setUnlocked);
  const settings = useAppStore((s) => s.settings);
  const showOnboarding = useAppStore((s) => s.showOnboarding);
  const dismissOnboarding = useAppStore((s) => s.dismissOnboarding);

  useEffect(() => {
    initDB().then(async () => {
      setDbReady(true);
      const st = useAppStore.getState();
      const legacyPin = (st.settings as { pin?: string }).pin;
      // Migrate legacy plaintext PIN -> PBKDF2 hash so it is never stored in cleartext.
      if (legacyPin && !st.settings.pinHash && /^\d{4}$/.test(legacyPin)) {
        try {
          const hashed = await hashPin(legacyPin);
          useAppStore.setState((s) => ({
            settings: { ...(s.settings as any), pinHash: hashed, pin: undefined }
          }));
        } catch {
          // crypto.subtle unavailable (insecure context); leave as-is so user can re-set.
        }
      }
      if (!st.settings.onboardingCompleted) {
        useAppStore.setState({ showOnboarding: true });
      }
    });

    const tw = (window as any).Telegram?.WebApp;
    if (tw) {
      tw.ready();
      tw.expand();
      tw.setHeaderColor('#0a0a0a');
      tw.setBackgroundColor('#0a0a0a');
    }
  }, []);

  if (!dbReady) {
    return (
      <div className="flex h-full items-center justify-center bg-usnee-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-usnee-accent border-t-transparent" />
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onDone={dismissOnboarding} />;
  }

  if (settings.pinHash && !unlocked) {
    return (
      <PinLock
        pinHash={settings.pinHash}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddEntry />} />
        <Route path="/history" element={<History />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/partials" element={<Partials />} />
      </Routes>
    </Layout>
  );
}

export default App;
