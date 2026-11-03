const styles = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  confirmed: 'bg-blue-50 text-blue-700 ring-blue-600/15',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/15',
  completed: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  critical: 'bg-rose-50 text-rose-700 ring-rose-600/15',
  default: 'bg-slate-100 text-slate-600 ring-slate-500/15',
};

export default function StatusBadge({ status = 'default', children, className = '' }) {
  const label = children || status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset ${styles[status.toLowerCase()] || styles.default} ${className}`}>
      <span className="size-1.5 rounded-full bg-current opacity-75" aria-hidden="true" />
      {label}
    </span>
  );
}
