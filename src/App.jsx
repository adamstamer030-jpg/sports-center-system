import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { invoke } from './lib/ipc.js';
import { useAuth } from './store/auth.js';

import Activation from './pages/Activation.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UsersPage from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import MembersPage from './pages/Members.jsx';
import SubscriptionsPage from './pages/Subscriptions.jsx';
import PlansPage from './pages/Plans.jsx';
import SportsPage from './pages/Sports.jsx';
import CoachesPage from './pages/Coaches.jsx';
import ReportsPage from './pages/Reports.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

function FullScreenLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-paper">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
    </div>
  );
}

export default function App() {
  const [license, setLicense] = useState(null);
  const [error, setError] = useState(null);
  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    invoke('license:status')
      .then(setLicense)
      .catch((e) => setError(e.message || 'فشل الاتصال بالنظام'));
  }, []);

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-paper">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          className="rounded bg-brand px-4 py-2 text-sm text-white"
          onClick={() => { setError(null); invoke('license:status').then(setLicense).catch((e) => setError(e.message)); }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (license === null) return <FullScreenLoader />;

  if (!license.activated) {
    return <Activation status={license} onActivated={setLicense} />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="sports" element={<SportsPage />} />
        <Route path="coaches" element={<CoachesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="users" element={isAdmin ? <UsersPage /> : <Navigate to="/" replace />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
