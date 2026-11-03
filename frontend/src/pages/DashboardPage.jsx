import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, Stethoscope, UsersRound } from 'lucide-react';
import { Link } from 'react-router';
import PageHeader from '../components/common/PageHeader.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import LoadingIndicator from '../components/common/LoadingIndicator.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import * as patientService from '../services/patients.js';
import * as doctorService from '../services/doctors.js';
import * as appointmentService from '../services/appointments.js';

function SummaryCard({ icon: Icon, label, value, href, linkLabel }) {
  return <article className="rounded-2xl border border-line bg-white p-5 shadow-[0_2px_12px_rgba(27,48,74,0.025)]">
    <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={19} /></div>
    <p className="mt-4 text-xs font-semibold text-slate-500">{label}</p>
    <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink">{value}</p>
    <Link to={href} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-dark">{linkLabel}<ArrowRight size={14} /></Link>
  </article>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    const now = new Date();
    try {
      const [patients, doctors, scheduled, confirmed] = await Promise.all([
        patientService.listPatients({ page: 1, limit: 1 }),
        doctorService.listDoctors({ page: 1, limit: 1 }),
        appointmentService.listAppointments({ page: 1, limit: 5, from: now.toISOString(), status: 'SCHEDULED' }),
        appointmentService.listAppointments({ page: 1, limit: 5, from: now.toISOString(), status: 'CONFIRMED' }),
      ]);
      const upcoming = [...scheduled.data, ...confirmed.data]
        .sort((left, right) => new Date(left.scheduledStart) - new Date(right.scheduledStart));
      setSummary({ patients, doctors, appointments: { data: upcoming.slice(0, 5), pagination: { total: scheduled.pagination.total + confirmed.pagination.total } } });
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load the dashboard from MediCore services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const firstName = user.name?.trim().split(/\s+/)[0] || 'there';
  const patientMap = new Map((summary?.patients?.data || []).map((patient) => [patient.id, patient]));
  const doctorMap = new Map((summary?.doctors?.data || []).map((doctor) => [doctor.id, doctor]));
  const patientMapComplete = summary?.patients?.pagination?.total <= (summary?.patients?.data?.length || 0);
  const doctorMapComplete = summary?.doctors?.pagination?.total <= (summary?.doctors?.data?.length || 0);
  return <>
    <PageHeader eyebrow="OVERVIEW" title={`Welcome, ${firstName}`} description="A live summary of the care records and appointments available to your account." actions={<Link to="/appointments" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><CalendarDays size={16} />Appointments</Link>} />
    {loading ? <div className="rounded-2xl border border-line bg-white p-8"><LoadingIndicator label="Loading live dashboard data" /></div> : error ? <div className="rounded-2xl border border-line bg-white"><ErrorState title="Dashboard data is unavailable" message={error} onRetry={loadSummary} /></div> : <>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard icon={UsersRound} label="Accessible patient records" value={summary.patients.pagination.total} href="/patients" linkLabel="View patient records" />
        <SummaryCard icon={Stethoscope} label="Active doctors" value={summary.doctors.pagination.total} href="/doctors" linkLabel="Browse doctors" />
        <SummaryCard icon={CalendarDays} label="Upcoming appointments" value={summary.appointments.pagination.total} href="/appointments" linkLabel="View schedule" />
      </div>
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_2px_12px_rgba(27,48,74,0.025)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div><h2 className="font-display text-sm font-bold text-ink">Upcoming appointments</h2><p className="mt-1 text-xs text-slate-500">The next scheduled visits available to your account</p></div>
          <Link to="/appointments" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-brand hover:bg-brand-soft">View all <ArrowRight size={14} /></Link>
        </div>
        {summary.appointments.data.length === 0 ? <div className="px-6 py-12 text-center"><div className="mx-auto grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><CalendarDays size={20} /></div><p className="mt-3 text-sm font-bold text-ink">No upcoming appointments</p><p className="mt-1 text-xs text-slate-500">New appointments will appear here after they are booked.</p></div> : <div className="divide-y divide-slate-100">
          {summary.appointments.data.map((appointment) => {
            const patient = patientMap.get(appointment.patientId);
            const doctor = doctorMap.get(appointment.doctorId);
            const patientLabel = patient ? [patient.firstName, patient.lastName].filter(Boolean).join(' ') : patientMapComplete ? 'Patient record' : `Patient ${appointment.patientId.slice(0, 8)}`;
            const doctorLabel = doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : doctorMapComplete ? 'Doctor profile' : `Doctor ${appointment.doctorId.slice(0, 8)}`;
            return <div key={appointment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Clock3 size={18} /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink">{patientLabel} <span className="font-normal text-slate-400">with</span> {doctorLabel}</p><p className="mt-1 text-xs text-slate-500">{new Date(appointment.scheduledStart).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {appointment.visitCategory}</p></div>
              <StatusBadge status={appointment.status.toLowerCase()}>{appointment.status.replaceAll('_', ' ')}</StatusBadge>
            </div>;
          })}
        </div>}
      </section>
    </>}
  </>;
}
