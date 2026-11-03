export default function Input({
  label,
  id,
  hint,
  error,
  leadingIcon: LeadingIcon,
  className = '',
  ...props
}) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor={inputId}>{label}</label>}
      <div className="relative">
        {LeadingIcon && <LeadingIcon aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />}
        <input
          id={inputId}
          className={`min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-ink placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 ${LeadingIcon ? 'pl-10' : ''} ${error ? 'border-rose-400' : 'border-line'} ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </div>
      {error && <p id={`${inputId}-error`} className="mt-1.5 text-xs text-rose-600">{error}</p>}
      {!error && hint && <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
