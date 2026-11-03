export default function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <div className={`mb-6 flex flex-col justify-between gap-4 sm:mb-7 sm:flex-row sm:items-end ${className}`}>
      <div>
        {eyebrow && <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>}
        <h1 className="font-display text-[25px] font-extrabold tracking-[-0.04em] text-ink sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
