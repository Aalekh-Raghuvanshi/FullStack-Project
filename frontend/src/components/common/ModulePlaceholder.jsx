import { ArrowRight, Sparkles } from 'lucide-react';
import EmptyState from './EmptyState.jsx';

export default function ModulePlaceholder({ title, description, icon: Icon }) {
  return (
    <>
      <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon size={25} aria-hidden="true" /></div>
        <div className="flex-1">
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700"><Sparkles size={12} />FOUNDATION READY</div>
          <h2 className="font-display text-base font-bold text-ink">{title} workspace</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400"><span className="size-2 rounded-full bg-slate-300" />Awaiting data connection</div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <EmptyState
          icon={Icon}
          title={`Your ${title.toLowerCase()} data will appear here`}
          description="This page is ready for the next development phase. Connect the backend API to start managing records in this workspace."
        />
      </section>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-500">
        <span>Need a hand getting started?</span>
        <button type="button" className="inline-flex items-center gap-1 font-bold text-brand hover:text-brand-dark">View setup guide <ArrowRight size={13} /></button>
      </div>
    </>
  );
}
