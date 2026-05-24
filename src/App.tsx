import { useState, useEffect, useCallback } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import RecordsPage from './pages/RecordsPage';
import ChartsPage from './pages/ChartsPage';
import ReportsPage from './pages/ReportsPage';
import GoalsPage from './pages/GoalsPage';
import RemindersPage from './pages/RemindersPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NewRecordModal from './components/NewRecordModal';
import Toast from './components/Toast';
import Disclaimer from './components/Disclaimer';
import AuthPage from './pages/AuthPage';
import { getSettings, addRecord, saveSettings } from './services/database';
import { supabase } from './services/supabase';
import { requestNotificationPermission, scheduleGlucoseReminders, checkMissedNotifications, setupForegroundHandler, syncRemindersWithBackend } from './services/notifications';
import { scheduleAutoBackup } from './services/backup';
import Onboarding from './components/Onboarding';
import type { GlucoseRecord, UserPhase, SensorType, InsulinUse, UserRole } from './types';
import type { Session } from '@supabase/supabase-js';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import SharePage from './pages/SharePage';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [userName, setUserName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [, setRefreshKey] = useState(0);
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('paciente');
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
      if (s) {
        loadSettings().then(async () => {
          // Sync reminders with push backend after settings load
          const settings = await getSettings();
          if (settings.reminders.length > 0) {
            syncRemindersWithBackend(settings.reminders);
          }
        });
        requestNotificationPermission();
        scheduleAutoBackup();
        setupForegroundHandler((msg) => addToast(msg));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        loadSettings();
      } else {
        setSettingsLoaded(false);
        setUserName('');
      }
    });

    // Check for missed notifications when app comes back to foreground
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkMissedNotifications((msg) => addToast(msg));
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadSettings = useCallback(async () => {
    const s = await getSettings();
    setUserName(s.name);
    setDarkMode(s.darkMode);
    setUserRole(s.role || 'paciente');
    if (!s.onboardingCompleted) {
      setShowOnboarding(true);
    }
    setSettingsLoaded(true);
  }, []);

  const handleOnboardingComplete = async (data: {
    name: string;
    phase: UserPhase;
    sensor: SensorType;
    insulinUse: InsulinUse;
    role: UserRole;
  }) => {
    const s = await getSettings();
    await saveSettings({
      ...s,
      name: data.name,
      phase: data.phase,
      sensor: data.sensor,
      insulinUse: data.insulinUse,
      role: data.role,
      onboardingCompleted: true,
    });
    setUserName(data.name);
    setUserRole(data.role);
    setShowOnboarding(false);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = async () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    const s = await getSettings();
    await saveSettings({ ...s, darkMode: newMode });
  };

  const handleNavigate = (page: string) => {
    if (page === 'new-record') {
      setShowNewRecord(true);
    } else if (page.startsWith('patient-detail:')) {
      setViewingPatientId(page.split(':')[1]);
      setCurrentPage('patient-detail');
    } else {
      setCurrentPage(page);
      if (page !== 'patient-detail') setViewingPatientId(null);
    }
  };

  const addToast = (message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleNewRecordSave = async (record: GlucoseRecord, options?: { scheduleAlarm?: boolean }) => {
    await addRecord(record);

    if (options?.scheduleAlarm && record.glucosePre && !record.glucosePos1h && !record.glucosePos2h) {
      const scheduled = await scheduleGlucoseReminders(
        record.mealType,
        record.timestamp,
        (msg) => addToast(msg),
      );
      if (scheduled.length > 0) {
        addToast(`Alarmes agendados: ${scheduled.join(' e ')}`);
      }
    }

    setRefreshKey((k) => k + 1);
    setShowNewRecord(false);
    setCurrentPage('dashboard');
  };

  const refreshAll = () => {
    setRefreshKey((k) => k + 1);
    loadSettings();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'records':
        return <RecordsPage />;
      case 'charts':
        return <ChartsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'goals':
        return <GoalsPage />;
      case 'reminders':
        return <RemindersPage />;
      case 'profile':
        return <ProfilePage onSettingsChange={refreshAll} />;
      case 'settings':
        return <SettingsPage darkMode={darkMode} onToggleDarkMode={toggleDarkMode} onSettingsChange={refreshAll} />;
      case 'patients':
        return <PatientsPage onNavigate={handleNavigate} />;
      case 'patient-detail':
        return viewingPatientId
          ? <PatientDetailPage patientId={viewingPatientId} onBack={() => handleNavigate('patients')} />
          : <PatientsPage onNavigate={handleNavigate} />;
      case 'share':
        return <SharePage />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentPage('dashboard');
    setSettingsLoaded(false);
  };

  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-logo">
            <img src="/logo-192.png" alt="GlicoMama" />
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage onAuth={() => loadSettings()} />;
  }

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo-192.png" alt="GlicoMama" style={{ width: 28, height: 28, borderRadius: 7 }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Glicemia & Mama</span>
        </div>
      </div>

      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        userName={userName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        userRole={userRole}
      />

      <main className="main-content">
        {renderPage()}
      </main>

      {showNewRecord && (
        <NewRecordModal
          onClose={() => setShowNewRecord(false)}
          onSave={handleNewRecordSave}
        />
      )}

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      )}

      <Disclaimer />

      {settingsLoaded && showOnboarding && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}
