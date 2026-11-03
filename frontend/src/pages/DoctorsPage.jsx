import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Stethoscope } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Button from '../components/common/Button.jsx';
import Modal from '../components/common/Modal.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import LoadingIndicator from '../components/common/LoadingIndicator.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { useNotify } from '../components/common/ToastProvider.jsx';
import * as doctorService from '../services/doctors.js';

const PAGE_SIZE = 12;
const doctorName = (doctor) => `Dr. ${[doctor.firstName, doctor.lastName].filter(Boolean).join(' ')}`;

function DoctorDetails({ doctor, onClose }) {
  return <Modal open onClose={onClose} title={doctorName(doctor)} description={`${doctor.specialization} · ${doctor.department}`}>
    <div className="mb-5 flex items-center gap-3 rounded-xl bg-brand-soft/60 p-4">
      <div className="grid size-12 place-items-center rounded-full bg-white text-brand"><Stethoscope size={21} /></div>
      <div><p className="text-sm font-bold text-ink">{doctor.doctorNumber}</p><p className="mt-0.5 text-xs text-slate-500">Provider record</p></div>
      <StatusBadge status={doctor.availability?.toLowerCase()} className="ml-auto">{doctor.availability?.replaceAll('_', ' ') || 'Unknown'}</StatusBadge>
    </div>
    <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      <div><dt className="text-xs font-semibold text-slate-400">Specialization</dt><dd className="mt-1 text-sm text-ink">{doctor.specialization}</dd></div>
      <div><dt className="text-xs font-semibold text-slate-400">Department</dt><dd className="mt-1 text-sm text-ink">{doctor.department}</dd></div>
      <div><dt className="text-xs font-semibold text-slate-400">Email</dt><dd className="mt-1 break-words text-sm text-ink">{doctor.email || '—'}</dd></div>
      <div><dt className="text-xs font-semibold text-slate-400">Phone</dt><dd className="mt-1 text-sm text-ink">{doctor.phone || '—'}</dd></div>
      <div><dt className="text-xs font-semibold text-slate-400">Availability</dt><dd className="mt-1 text-sm capitalize text-ink">{doctor.availability?.toLowerCase().replaceAll('_', ' ') || 'Unknown'}</dd></div>
    </dl>
  </Modal>;
}

export default function DoctorsPage() {
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const requestId = useRef(0);

  const loadDoctors = useCallback(async (query = search, currentPage = page) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const nextResult = await doctorService.listDoctors({ page: currentPage, limit: PAGE_SIZE, ...(query.trim() ? { search: query.trim() } : {}) });
      if (requestId.current === currentRequest) setResult(nextResult);
    } catch (requestError) {
      if (requestId.current === currentRequest) setError(requestError.userMessage || 'Unable to load the doctor directory.');
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { loadDoctors(); }, 250);
    return () => { window.clearTimeout(timeout); requestId.current += 1; };
  }, [loadDoctors]);

  async function openDoctor(doctorId) {
    setDetailLoading(true);
    try { setSelectedDoctor(await doctorService.getDoctor(doctorId)); }
    catch (requestError) { notify(requestError.userMessage || 'Unable to load this doctor profile.', 'error'); }
    finally { setDetailLoading(false); }
  }

  const doctors = result?.data || [];
  const pagination = result?.pagination;
  return <>
    <PageHeader eyebrow="CARE OPERATIONS" title="Doctors" description="Find a provider by name or specialty and review their current availability." />
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_2px_12px_rgba(27,48,74,0.025)]">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 className="font-display text-sm font-bold text-ink">Doctor directory</h2><p className="mt-1 text-xs text-slate-500">{pagination ? `${pagination.total} active provider${pagination.total === 1 ? '' : 's'}` : 'Provider profiles available to your account'}</p></div>
        <label className="relative w-full sm:max-w-xs"><span className="sr-only">Search doctors by name or specialization</span><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name or specialization" className="min-h-10 w-full rounded-xl border border-line bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10" /></label>
      </div>
      {loading ? <div className="p-8"><LoadingIndicator label="Loading doctor directory" /></div> : error ? <ErrorState title="Could not load doctors" message={error} onRetry={() => loadDoctors()} /> : doctors.length === 0 ? <EmptyState icon={Stethoscope} title={search ? 'No matching doctors' : 'No doctors found'} description={search ? 'Try a different provider name or specialty.' : 'Active provider profiles will appear here when available.'} /> : <>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">{doctors.map((doctor) => <button key={doctor.id} type="button" onClick={() => openDoctor(doctor.id)} className="rounded-2xl border border-line p-4 text-left transition hover:border-brand/40 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Stethoscope size={19} /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink">{doctorName(doctor)}</p><p className="mt-1 truncate text-xs text-slate-500">{doctor.specialization}</p></div>
            <StatusBadge status={doctor.availability?.toLowerCase()}>{doctor.availability?.replaceAll('_', ' ') || 'Unknown'}</StatusBadge>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-slate-500"><span>{doctor.department}</span><span>{doctor.doctorNumber}</span></div>
        </button>)}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-slate-500"><span>Page {pagination?.page || page} of {Math.max(1, pagination?.totalPages || 1)} · {pagination?.total || 0} total</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><Button size="sm" variant="secondary" disabled={!pagination || page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>
      </>}
    </section>
    {detailLoading && <div className="mt-4"><LoadingIndicator label="Loading doctor profile" /></div>}
    {selectedDoctor && <DoctorDetails doctor={selectedDoctor} onClose={() => setSelectedDoctor(null)} />}
  </>;
}
