export default function Select({ label, error, hint, className = '', id, children, ...props }) {
  const selectId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`h-11 rounded border px-3.5 text-sm text-ink bg-surface
          transition-colors duration-150 outline-none
          ${error ? 'border-danger-500 focus:border-danger-500' : 'border-line focus:border-brand'}
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-danger-500">{error}</span>}
      {!error && hint && <span className="text-xs text-ink-mute">{hint}</span>}
    </div>
  );
}
