import {
  Activity, BarChart3, BrainCircuit, CalendarDays, ChevronLeft, CreditCard,
  FlaskConical, LayoutDashboard, Settings, Stethoscope, UserRound, UsersRound,
  Webhook,
} from 'lucide-react';
import { NavLink } from 'react-router';
import logo from '../../assets/medicore-mark.svg';

const sections = [
  {
    label: 'WORKSPACE',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/patients', label: 'Patients', icon: UsersRound },
      { to: '/doctors', label: 'Doctors', icon: Stethoscope },
      { to: '/appointments', label: 'Appointments', icon: CalendarDays, count: '8' },
      { to: '/admissions', label: 'Admissions', icon: Activity },
      { to: '/laboratory', label: 'Laboratory', icon: FlaskConical },
      { to: '/billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    label: 'INTELLIGENCE',
    links: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/patient-intelligence', label: 'Patient Intelligence', icon: BrainCircuit },
      { to: '/webhooks', label: 'Webhook Management', icon: Webhook },
    ],
  },
];

export default function Sidebar({ open = false, onNavigate }) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-line bg-white transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[76px] items-center justify-between border-b border-line px-6">
        <NavLink to="/dashboard" onClick={onNavigate} className="flex items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" aria-label="MediCore AI home">
          <img src={logo} alt="" className="size-10" />
          <div>
            <div className="font-display text-base font-extrabold tracking-tight text-ink">MediCore<span className="text-brand"> AI</span></div>
            <div className="mt-0.5 text-[10px] font-semibold tracking-[0.16em] text-slate-400">HOSPITAL INTELLIGENCE</div>
          </div>
        </NavLink>
        <button type="button" onClick={onNavigate} aria-label="Close navigation" className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"><ChevronLeft size={18} /></button>
      </div>

      <div className="mx-4 mt-5 rounded-xl border border-brand/10 bg-brand-soft/70 p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.13em] text-brand-dark">CARE CENTER</span>
          <span className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" aria-label="Online" />
        </div>
        <p className="mt-1 text-sm font-bold text-ink">Northstar General</p>
        <p className="mt-0.5 text-xs text-slate-500">Main campus · 240 beds</p>
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 pb-5 pt-6">
        {sections.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.16em] text-slate-400">{section.label}</p>
            <div className="space-y-1">
              {section.links.map(({ to, label, icon: Icon, count }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) => `group flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors ${isActive ? 'bg-brand-soft text-brand-dark' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'}`}
                >
                  {({ isActive }) => <>
                    <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    {count && <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/80 text-brand-dark' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
                  </>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <NavLink to="/settings" onClick={onNavigate} className={({ isActive }) => `flex min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-semibold ${isActive ? 'bg-brand-soft text-brand-dark' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Settings size={17} strokeWidth={1.8} aria-hidden="true" />Settings
        </NavLink>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#dff1ee] text-xs font-extrabold text-brand-dark">AM</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">Alex Morgan</p>
            <p className="truncate text-[11px] text-slate-500">Hospital administrator</p>
          </div>
          <UserRound size={16} className="text-slate-400" aria-hidden="true" />
        </div>
      </div>
    </aside>
  );
}
