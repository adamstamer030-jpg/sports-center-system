import { useEffect, useState } from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { invoke } from '../lib/ipc.js';
import { formatCurrency, formatNumber } from '../lib/format.js';

export default function ReportsPage() {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);

  useEffect(() => {
    invoke('reports:dashboard').then(setStats);
    invoke('reports:revenueSeries').then(setSeries);
  }, []);

  const max = Math.max(1, ...series.map((d) => d.total));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">التقارير</h1>
        <p className="mt-1 text-sm text-ink-mute">الإيرادات وتوزيع الأعضاء على الرياضات</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="إيراد اليوم" value={stats ? formatCurrency(stats.todayRevenue) : '—'} icon={<Wallet size={20} />} />
        <StatCard label="إيراد الشهر الحالي" value={stats ? formatCurrency(stats.monthRevenue) : '—'} icon={<TrendingUp size={20} />} />
      </div>

      <Card accent>
        <h2 className="mb-4 font-display text-base font-semibold text-ink">الإيراد اليومي — آخر ١٤ يوم</h2>
        <div className="flex items-end gap-2" style={{ height: 160 }}>
          {series.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand"
                style={{ height: `${Math.max(4, (d.total / max) * 130)}px` }}
                title={`${d.day}: ${formatCurrency(d.total)}`}
              />
              <span className="tnum text-[10px] text-ink-mute">{d.day.slice(8, 10)}/{d.day.slice(5, 7)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-base font-semibold text-ink">الاشتراكات النشطة حسب الرياضة</h2>
        {stats && stats.bySport.length === 0 && <p className="text-sm text-ink-mute">لا توجد بيانات بعد</p>}
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-line text-ink-mute">
              <th className="pb-2 font-medium">الرياضة</th>
              <th className="pb-2 font-medium">عدد الاشتراكات النشطة</th>
            </tr>
          </thead>
          <tbody>
            {stats?.bySport.map((s) => (
              <tr key={s.id} className="border-b border-line/60 last:border-0">
                <td className="py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                </td>
                <td className="tnum py-2.5">{formatNumber(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
