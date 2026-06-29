export default function Card({ accent = false, className = '', children, ...props }) {
  return (
    <div
      className={`bg-surface rounded-lg border border-line shadow-card overflow-hidden ${className}`}
      {...props}
    >
      {accent && <div className="h-[3px] bg-brand" />}
      <div className="p-5">{children}</div>
    </div>
  );
}
