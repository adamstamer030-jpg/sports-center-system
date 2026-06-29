const VARIANTS = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-brand-50 text-brand-700',
  warning: 'bg-amber-100 text-amber-500',
  danger: 'bg-danger-100 text-danger-500',
  neutral: 'bg-paper text-ink-mute border border-line',
};

export default function Badge({ variant = 'neutral', children }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
