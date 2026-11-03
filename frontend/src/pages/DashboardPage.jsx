import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarPlus,
  CircleDollarSign, Clock3, Download, HeartPulse, MoreHorizontal,
  Plus, UserRound, UsersRound,
} from 'lucide-react';
import { Link } from 'react-router';
import Button from '../components/common/Button.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';

const stats = [
  { label: 'Total patients', value: '1,284', change: '+12.8%', direction: 'up', period: 'vs last month', icon: UsersRound, tint: 'bg-blue-50 text-blue-600' },
  { label: "Today's appointments", value: '42', change: '+6.4%', direction: 'up', period: 'vs yesterday', icon: CalendarPlus, tint: 'bg-brand-soft text-brand' },
  { label: 'Available beds', value: '18', change: '84% occupied', direction: 'down', period: 'of 112 total beds', icon: HeartPulse, tint: 'bg-violet-50 text-violet-600' },
  { label: 'Revenue this month', value: '$84,250', change: '+8.2%', direction: 'up', period: 'vs last month', icon: CircleDollarSign, tint: 'bg-amber-50 text-amber-600' },
];

const appointments = [
  { initials: 'SC', name: 'Sarah Chen', id: 'PT-2048', department: 'Cardiology', doctor: 'Dr. James Wilson', time: '09:30 AM', status: 'Confirmed', color: 'bg-rose-100 text-rose-700' },
  { initials: 'MR', name: 'Michael Rivera', id: 'PT-1982', department: 'Neurology', doctor: 'Dr. Anika Patel', time: '10:15 AM', status: 'Pending', color: 'bg-blue-100 text-blue-700' },
  { initials: 'JP', name: 'Jasmine Patel', id: 'PT-2194', department: 'Orthopedics', doctor: 'Dr. Robert Kim', time: '11:00 AM', status: 'Confirmed', color: 'bg-amber-100 text-amber-700' },
  { initials: 'DW', name: 'David Williams', id: 'PT-1756', department: 'General care', doctor: 'Dr. Emily Brooks', time: '11:45 AM', status: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const volumes = [46, 67, 54, 82, 70, 91, 62];

function StatCard({ stat }) {
  const Icon = stat.icon;
  const TrendIcon = stat.direction === 'up' ? ArrowUpRight : ArrowDownRight;
  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-[0_2px_12px_rgba(27,48,74,0.025)] sm:p-5">
      <div className="flex items-start justify-between">
        <div className={`grid size-10 place-items-center rounded-xl ${stat.tint}`}><Icon size={19} aria-hidden="true" /></div>
        <button type="button" aria-label={`More options for ${stat.label}`} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"><MoreHorizontal size={18} /></button>
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-500">{stat.label}</p>
      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <p className="font-display text-[25px] font-extrabold tracking-tight text-ink">{stat.value}</p>
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${stat.direction === 'up' ? 'text-emerald-600' : 'text-brand'}`}>
          <TrendIcon size={13} aria-hidden="true" />{stat.change}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">{stat.period}</p>
    </article>
  );
}

function VisitsChart() {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_2px_12px_rgba(27,48,74,0.025)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold text-ink">Patient visits</h2>
          <p className="mt-1 text-xs text-slate-500">Weekly patient activity across departments</p>
        </div>
        <button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">This week <span className="text-slate-400">⌄</span></button>
      </div>
      <div className="mt-5 grid grid-cols-[30px_1fr] gap-3">
        <div className="flex h-44 flex-col justify-between pb-5 text-[10px] text-slate-400"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
        <div className="relative h-44">
          <div className="absolute inset-0 flex flex-col justify-between pb-5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((line) => <div key={line} className="border-t border-dashed border-slate-100" />)}
          </div>
          <div role="img" aria-label="Bar chart of patient visits from Monday to Sunday, ranging between 46 and 91 visits" className="absolute inset-x-0 bottom-5 top-1 flex items-end justify-around gap-2 px-1 sm:px-5">
            {volumes.map((volume, index) => (
              <div key={days[index]} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className={`w-full max-w-10 rounded-t-lg transition-all ${index === 4 ? 'bg-brand' : 'bg-[#d8f0ed] hover:bg-[#a7ded8]'}`} style={{ height: `${volume}%` }} />
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-around px-1 text-[10px] font-medium text-slate-400 sm:px-5">
            {days.map((day) => <span key={day}>{day}</span>)}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500"><span className="size-2 rounded-full bg-brand" />Patient visits <span className="ml-auto font-bold text-ink">472 <span className="font-medium text-slate-400">this week</span></span></div>
    </section>
  );
}

function DepartmentCard() {
  const departments = [
    { name: 'Cardiology', value: 34, color: 'bg-brand' },
    { name: 'Neurology', value: 27, color: 'bg-[#6e8be8]' },
    { name: 'Orthopedics', value: 22, color: 'bg-[#f1ad62]' },
    { name: 'General care', value: 17, color: 'bg-[#a6b5c8]' },
  ];
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_2px_12px_rgba(27,48,74,0.025)] sm:p-6">
      <div className="flex items-start justify-between">
        <div><h2 className="font-display text-sm font-bold text-ink">Department overview</h2><p className="mt-1 text-xs text-slate-500">Patient distribution</p></div>
        <button type="button" aria-label="Department chart options" className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"><MoreHorizontal size={18} /></button>
      </div>
      <div className="mt-5 flex items-center gap-5">
        <div role="img" aria-label="Donut chart showing patient distribution among four departments" className="relative grid size-[132px] shrink-0 place-items-center rounded-full" style={{ background: 'conic-gradient(#148f8b 0% 34%, #6e8be8 34% 61%, #f1ad62 61% 83%, #a6b5c8 83% 100%)' }}>
          <div className="grid size-[88px] place-items-center rounded-full bg-white text-center"><div><span className="block font-display text-xl font-extrabold text-ink">1,284</span><span className="text-[9px] text-slate-400">Patients</span></div></div>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {departments.map((department) => <div key={department.name} className="flex items-center gap-2"><span className={`size-2 shrink-0 rounded-full ${department.color}`} /><span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-600">{department.name}</span><span className="text-[11px] font-bold text-ink">{department.value}%</span></div>)}
        </div>
      </div>
      <Link to="/analytics" className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-dark">View analytics <ArrowRight size={14} /></Link>
    </section>
  );
}

function AppointmentsTable() {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_2px_12px_rgba(27,48,74,0.025)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div><h2 className="font-display text-sm font-bold text-ink">Today's appointments</h2><p className="mt-1 text-xs text-slate-500">Your upcoming patient schedule</p></div>
        <Link to="/appointments" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-brand hover:bg-brand-soft">View all <ArrowRight size={14} /></Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead><tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"><th className="px-6 py-3">Patient</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Doctor</th><th className="px-4 py-3">Time</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {appointments.map((appointment) => <tr key={appointment.id} className="transition-colors hover:bg-slate-50/60">
              <td className="px-6 py-3.5"><div className="flex items-center gap-3"><div className={`grid size-9 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${appointment.color}`}>{appointment.initials}</div><div><p className="text-xs font-bold text-ink">{appointment.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{appointment.id}</p></div></div></td>
              <td className="px-4 py-3.5 text-xs text-slate-600">{appointment.department}</td><td className="px-4 py-3.5 text-xs text-slate-600">{appointment.doctor}</td>
              <td className="px-4 py-3.5"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Clock3 size={13} className="text-slate-400" />{appointment.time}</span></td>
              <td className="px-4 py-3.5"><StatusBadge status={appointment.status.toLowerCase()}>{appointment.status}</StatusBadge></td>
              <td className="px-4 py-3.5"><button type="button" aria-label={`More options for ${appointment.name}`} className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-ink"><MoreHorizontal size={17} /></button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[11px] text-slate-400 sm:px-6"><span>Showing 4 of 42 appointments</span><div className="flex gap-1"><button type="button" aria-label="Previous appointments" className="grid size-7 place-items-center rounded-lg border border-line hover:bg-slate-50">‹</button><button type="button" aria-label="Next appointments" className="grid size-7 place-items-center rounded-lg border border-line hover:bg-slate-50">›</button></div></div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="OVERVIEW"
        title="Good morning, Alex"
        description="Here’s what’s happening across Northstar General today."
        actions={<>
          <Button variant="secondary" className="hidden sm:inline-flex"><Download size={15} />Export report</Button>
          <Button><Plus size={16} />New appointment</Button>
        </>}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <VisitsChart />
        <DepartmentCard />
      </div>

      <div className="mb-5"><AppointmentsTable /></div>

      <section aria-label="Operational summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/admissions" className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-brand/30 hover:shadow-sm">
          <div className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><HeartPulse size={18} /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-ink">Bed occupancy</p><p className="mt-0.5 text-[11px] text-slate-500">94 of 112 beds in use</p></div><span className="text-xs font-bold text-ink">84%</span><ArrowUpRight size={15} className="text-slate-300 group-hover:text-brand" />
        </Link>
        <Link to="/laboratory" className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-brand/30 hover:shadow-sm">
          <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><Activity size={18} /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-ink">Lab requests</p><p className="mt-0.5 text-[11px] text-slate-500">12 awaiting review</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">12 new</span><ArrowRight size={15} className="text-slate-300 group-hover:text-brand" />
        </Link>
        <Link to="/analytics" className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-brand/30 hover:shadow-sm">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ArrowUpRight size={18} /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-ink">Patient satisfaction</p><p className="mt-0.5 text-[11px] text-slate-500">Average care rating</p></div><span className="text-xs font-bold text-ink">4.8<span className="font-medium text-slate-400"> / 5</span></span><ArrowRight size={15} className="text-slate-300 group-hover:text-brand" />
        </Link>
      </section>
    </>
  );
}
