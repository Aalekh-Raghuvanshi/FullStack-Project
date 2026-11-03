import { Bell, ChevronDown, Menu, Search } from 'lucide-react';
import Button from '../common/Button.jsx';

export default function Topbar({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onMenuClick} aria-label="Open navigation"><Menu size={20} /></Button>
        <div className="hidden min-w-0 items-center gap-2 text-xs text-slate-400 sm:flex">
          <span>MediCore</span><span>/</span><span className="truncate font-semibold text-slate-600">Hospital overview</span>
        </div>
        <span className="truncate text-sm font-bold text-ink sm:hidden">MediCore AI</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <label className="relative hidden md:block">
          <span className="sr-only">Search patients, doctors, or records</span>
          <Search size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Search anything..." className="h-10 w-60 rounded-xl border border-line bg-slate-50 pl-10 pr-12 text-xs outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10 lg:w-72" />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1.5 py-0.5 text-[9px] text-slate-400">⌘ K</kbd>
        </label>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell size={19} />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full border-2 border-white bg-rose-500" />
        </Button>
        <div className="hidden h-8 w-px bg-line sm:block" />
        <button type="button" className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          <div className="grid size-9 place-items-center rounded-full bg-[#e2f2ef] text-xs font-extrabold text-brand-dark">AM</div>
          <span className="hidden text-xs font-bold text-slate-700 lg:block">Alex Morgan</span>
          <ChevronDown size={15} className="hidden text-slate-400 lg:block" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
