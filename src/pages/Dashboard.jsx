import { useEffect, useState } from 'react';
import { Users, Wallet, AlertTriangle, Activity } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import { invoke } from '../lib/ipc.js';
import { formatNumber, formatCurrency } from '../lib/format.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);

  useEffect(() => {
    invoke('reports:dashboard').then(setStats);
    invoke('subscriptions:list', { expiringWithinDays: 7 }).then(setExpiring);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">نظرة عامة</h1>
        <p className="mt-1 text-sm text-ink-mute">ملخص سريع لحالة مركز التدريب اليوم</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="عدد الأعضاء" value={stats ? formatNumber(stats.membersCount) : '—'} icon={<Users size={20} />} />
        <StatCard label="اشتراكات نشطة" value={stats ? formatNumber(stats.activeSubscriptions) : '—'} icon={<Activity size={20} />} />
        <StatCard label="على وشك الانتهاء (٧ أيام)" value={stats ? formatNumber(stats.expiringSoon) : '—'} icon={<AlertTriangle size={20} />} />
        <StatCard label="إيراد اليوم" value={stats ? formatCurrency(stats.todayRevenue) : '—'} icon={<Wallet size={20} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card accent>
          <h2 className="mb-3 font-display text-base font-semibold text-ink">توزيع الاشتراكات النشطة على الرياضات</h2>
          {!stats && <p className="text-sm text-ink-mute">جاري التحميل...</p>}
          {stats && stats.bySport.length === 0 && <p className="text-sm text-ink-mute">لا توجد اشتراكات نشطة بعد</p>}
          <div className="space-y-2">
            {stats?.bySport.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-ink">{s.name}</span>
                </div>
                <span className="tnum font-medium text-ink">{formatNumber(s.total)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 font-display text-base font-semibold text-ink">اشتراكات على وشك الانتهاء</h2>
          {expiring.length === 0 && <p className="text-sm text-ink-mute">لا يوجد اشتراكات قريبة من الانتهاء</p>}
          <div className="space-y-2">
            {expiring.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-line/60 pb-2 text-sm last:border-0 last:pb-0">
                <div>
                  <p className="text-ink">{s.memberName}</p>
                  <p className="text-xs text-ink-mute">{s.sportName}</p>
                </div>
                <Badge variant="warning">
                  {s.durationType === 'sessions' ? `${s.sessionsLeft} حصة متبقية` : `${s.daysLeft} يوم متبقي`}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
