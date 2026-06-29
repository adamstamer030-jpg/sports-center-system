import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { useAuth } from '../../store/auth.js';

export default function AppLayout() {
  const isAdmin = useAuth((s) => s.user?.role === 'admin');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
