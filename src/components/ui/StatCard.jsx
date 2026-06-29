export default function StatCard({ label, value, icon, suffix = '' }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <div className="h-[3px] bg-brand" />
      <div className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm text-ink-mute">{label}</p>
          <p className="tnum mt-2 text-2xl font-semibold text-ink">
            {value}
            {suffix && <span className="mr-1 font-sans text-sm text-ink-mute">{suffix}</span>}
          </p>
        </div>
        {icon && <div className="rounded-lg bg-brand-50 p-2.5 text-brand-700">{icon}</div>}
      </div>
    </div>
  );
}
