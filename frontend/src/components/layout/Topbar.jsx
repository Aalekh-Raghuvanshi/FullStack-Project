import { Menu } from 'lucide-react';
import Button from '../common/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLocation } from 'react-router';

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();
  const pageLabel = location.pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ') || 'dashboard';
  const initials = (user?.name || user?.email || 'MC').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={onMenuClick} aria-label="Open navigation"><Menu size={20} /></Button>
        <div className="hidden min-w-0 items-center gap-2 text-xs text-slate-400 sm:flex">
          <span>MediCore</span><span>/</span><span className="truncate font-semibold capitalize text-slate-600">{pageLabel}</span>
        </div>
        <span className="truncate text-sm font-bold text-ink sm:hidden">MediCore AI</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden h-8 w-px bg-line sm:block" />
        <div className="flex items-center gap-2 rounded-xl p-1.5 text-left" aria-label={`Signed in as ${user?.name || user?.email}`}>
          <div className="grid size-9 place-items-center rounded-full bg-[#e2f2ef] text-xs font-extrabold text-brand-dark">{initials}</div>
          <span className="hidden max-w-40 truncate text-xs font-bold text-slate-700 lg:block">{user?.name || user?.email}</span>
        </div>
      </div>
    </header>
  );
}
