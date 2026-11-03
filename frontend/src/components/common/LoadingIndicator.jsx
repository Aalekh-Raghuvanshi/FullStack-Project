export default function LoadingIndicator({ label = 'Loading', className = '' }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-3 text-sm font-medium text-slate-600 ${className}`}>
      <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
      <span>{label}</span>
    </div>
  );
}
