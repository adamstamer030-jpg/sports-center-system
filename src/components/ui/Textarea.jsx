export default function Textarea({ label, error, hint, className = '', id, rows = 3, ...props }) {
  const areaId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={areaId} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        rows={rows}
        className={`rounded border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-mute bg-surface
          transition-colors duration-150 outline-none resize-none
          ${error ? 'border-danger-500 focus:border-danger-500' : 'border-line focus:border-brand'}
          ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-danger-500">{error}</span>}
      {!error && hint && <span className="text-xs text-ink-mute">{hint}</span>}
    </div>
  );
}
