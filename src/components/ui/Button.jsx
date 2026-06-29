const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:bg-paper',
  ghost: 'bg-transparent text-ink-soft hover:bg-paper',
  danger: 'bg-danger-500 text-white hover:opacity-90',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  icon = null,
  children,
  ...props
}) {
  const sizeCls = size === 'sm' ? 'h-9 px-3 text-sm' : size === 'lg' ? 'h-12 px-6 text-base' : 'h-10 px-4 text-sm';
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${sizeCls} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
