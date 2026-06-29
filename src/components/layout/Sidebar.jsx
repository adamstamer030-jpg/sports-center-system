import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, ShieldCheck, UserSquare2, Dumbbell, ClipboardList, BarChart3, IdCard } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { to: '/members', label: 'الأعضاء', icon: IdCard },
  { to: '/subscriptions', label: 'الاشتراكات', icon: ClipboardList },
  { to: '/plans', label: 'خطط الاشتراك', icon: BarChart3 },
  { to: '/sports', label: 'الرياضات', icon: Dumbbell },
  { to: '/coaches', label: 'المدربون', icon: UserSquare2 },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
  { to: '/users', label: 'المستخدمون', icon: Users, adminOnly: true },
  { to: '/settings', label: 'الإعدادات والترخيص', icon: Settings },
];

export default function Sidebar({ isAdmin }) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-s border-line bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
          <ShieldCheck size={18} />
        </div>
        <div>
          <p className="font-display text-sm font-bold leading-tight text-ink">مركز التدريب الرياضي</p>
          <p className="text-[11px] leading-tight text-ink-mute">Sports Center</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150 ${
                isActive
                  ? 'border-e-[3px] border-brand bg-brand-50 font-medium text-brand-700'
                  : 'text-ink-soft hover:bg-paper'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line px-5 py-4 text-[11px] text-ink-mute">
        إصدار النظام 1.0.0
      </div>
    </aside>
  );
}
