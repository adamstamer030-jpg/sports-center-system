import { LogOut } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import { useAuth } from '../../store/auth.js';

const ROLE_LABEL = { admin: 'مدير', staff: 'موظف' };

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-end">
          <p className="text-sm font-medium text-ink">{user?.name}</p>
          <Badge variant={user?.role === 'admin' ? 'brand' : 'neutral'}>
            {ROLE_LABEL[user?.role] || user?.role}
          </Badge>
        </div>
        <button
          onClick={logout}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-mute hover:bg-paper hover:text-danger-500"
          title="تسجيل الخروج"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
