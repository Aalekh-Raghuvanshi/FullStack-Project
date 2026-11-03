import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CalendarPlus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Modal from '../components/common/Modal.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import LoadingIndicator from '../components/common/LoadingIndicator.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../components/common/ToastProvider.jsx';
import * as appointmentService from '../services/appointments.js';
import * as patientService from '../services/patients.js';
import * as doctorService from '../services/doctors.js';

const PAGE_SIZE = 20;
const statuses = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const fieldClass = 'min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10';
const dateTimeLocal = (value) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const formatDateTime = (value) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const patientName = (patient) => [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || (patient?.id ? `Patient ${patient.id.slice(0, 8)}` : 'Patient unavailable');
const doctorName = (doctor) => doctor ? `Dr. ${[doctor.firstName, doctor.lastName].filter(Boolean).join(' ')}` : 'Doctor unavailable';
const selectLabel = 'mb-1.5 block text-sm font-semibold text-slate-700';

function optionsErrorMessage(results) {
  const failed = results.find((result) => result.status === 'rejected');
  return failed?.reason?.userMessage || (failed ? 'Some booking options could not be loaded.' : '');
}

function AppointmentForm({ mode, appointment, patients, doctors, user, onClose, onSaved }) {
  const notify = useNotify();
  const canChoosePatient = ['ADMIN', 'RECEPTIONIST'].includes(user.role);
  const patientId = user.role === 'PATIENT' ? user.patientProfileId : '';
  const [patientQuery, setPatientQuery] = useState('');
  const [doctorQuery, setDoctorQuery] = useState('');
  const [patientChoices, setPatientChoices] = useState(patients);
  const [doctorChoices, setDoctorChoices] = useState(doctors);
  const [patientSearchError, setPatientSearchError] = useState('');
  const [doctorSearchError, setDoctorSearchError] = useState('');
  const [form, setForm] = useState(() => mode === 'reschedule'
    ? { scheduledStart: dateTimeLocal(appointment.scheduledStart), scheduledEnd: dateTimeLocal(appointment.scheduledEnd) }
    : { patientId, doctorId: '', scheduledStart: '', scheduledEnd: '', visitCategory: '' });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      if (!patientQuery.trim()) {
        setPatientChoices(patients);
        setPatientSearchError('');
        return;
      }
      try {
        const response = await patientService.listPatients({ page: 1, limit: 100, search: patientQuery.trim() });
        if (active) {
          setPatientChoices(response.data);
          setPatientSearchError('');
        }
      } catch (error) {
        if (active) {
          setPatientChoices([]);
          setPatientSearchError(error.userMessage || 'Unable to search patient records.');
        }
      }
    }, 200);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [patientQuery, patients]);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      if (!doctorQuery.trim()) {
        setDoctorChoices(doctors);
        setDoctorSearchError('');
        return;
      }
      try {
        const response = await doctorService.listDoctors({ page: 1, limit: 100, search: doctorQuery.trim() });
        if (active) {
          setDoctorChoices(response.data);
          setDoctorSearchError('');
        }
      } catch (error) {
        if (active) {
          setDoctorChoices([]);
          setDoctorSearchError(error.userMessage || 'Unable to search doctors.');
        }
      }
    }, 200);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [doctorQuery, doctors]);

  function setValue(name, value) { setForm((current) => ({ ...current, [name]: value })); }
  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.scheduledStart) nextErrors.scheduledStart = 'Choose a start date and time.';
    if (!form.scheduledEnd) nextErrors.scheduledEnd = 'Choose an end date and time.';
    if (form.scheduledStart && new Date(form.scheduledStart) <= new Date()) nextErrors.scheduledStart = 'Choose a future appointment time.';
    if (form.scheduledStart && form.scheduledEnd && new Date(form.scheduledEnd) <= new Date(form.scheduledStart)) nextErrors.scheduledEnd = 'End time must be after start time.';
    if (mode === 'create' && canChoosePatient && !form.patientId) nextErrors.patientId = 'Select a patient.';
    if (mode === 'create' && !form.doctorId) nextErrors.doctorId = 'Select a doctor.';
    if (mode === 'create' && !form.visitCategory.trim()) nextErrors.visitCategory = 'Enter a visit reason or category.';
    if (mode === 'create' && user.role === 'PATIENT' && !patientId) nextErrors.patientId = 'Your account is not linked to a patient record. Contact the care team to book.';
    setErrors(nextErrors);
    setRequestError('');
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      const timePayload = { scheduledStart: new Date(form.scheduledStart).toISOString(), scheduledEnd: new Date(form.scheduledEnd).toISOString() };
      const saved = mode === 'reschedule'
        ? await appointmentService.rescheduleAppointment(appointment.id, timePayload)
        : await appointmentService.createAppointment({ ...timePayload, patientId: canChoosePatient ? form.patientId : patientId, doctorId: form.doctorId, visitCategory: form.visitCategory.trim() });
      notify(mode === 'reschedule' ? 'Appointment rescheduled.' : 'Appointment booked.');
      onSaved(saved);
    } catch (error) {
      setRequestError(error.userMessage || 'Unable to save this appointment.');
    } finally {
      setSaving(false);
    }
  }

  return <Modal open onClose={saving ? undefined : onClose} title={mode === 'reschedule' ? 'Reschedule appointment' : 'Book an appointment'} description={mode === 'reschedule' ? 'Choose a new future time. The server checks schedule conflicts.' : 'Select the patient, provider, and visit time.'}>
    <form onSubmit={submit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      {requestError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{requestError}</p>}
      {mode === 'create' && <>
        {canChoosePatient ? <div><Input label="Search patients" id="appointment-patient-search" value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} placeholder="Name, email, or patient number" />{patientSearchError && <p role="alert" className="mt-1.5 text-xs text-rose-600">{patientSearchError}</p>}<label htmlFor="appointment-patient" className={`${selectLabel} mt-3`}>Patient</label><select id="appointment-patient" className={fieldClass} value={form.patientId} onChange={(event) => setValue('patientId', event.target.value)}><option value="">Select a patient</option>{patientChoices.map((patient) => <option key={patient.id} value={patient.id}>{patientName(patient)} · {patient.patientNumber}</option>)}</select>{errors.patientId && <p className="mt-1.5 text-xs text-rose-600">{errors.patientId}</p>}{patientChoices.length === 0 && <p className="mt-1.5 text-xs text-amber-700">No patient records match this search.</p>}</div> : <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Booking for your patient record <span className="font-semibold">{patientId || 'not linked'}</span></div>}
        <div><Input label="Search doctors" id="appointment-doctor-search" value={doctorQuery} onChange={(event) => setDoctorQuery(event.target.value)} placeholder="Name or specialization" />{doctorSearchError && <p role="alert" className="mt-1.5 text-xs text-rose-600">{doctorSearchError}</p>}<label htmlFor="appointment-doctor" className={`${selectLabel} mt-3`}>Doctor</label><select id="appointment-doctor" className={fieldClass} value={form.doctorId} onChange={(event) => setValue('doctorId', event.target.value)}><option value="">Select an available doctor</option>{doctorChoices.filter((doctor) => doctor.availability === 'AVAILABLE').map((doctor) => <option key={doctor.id} value={doctor.id}>Dr. {doctor.firstName} {doctor.lastName} · {doctor.specialization}</option>)}</select>{errors.doctorId && <p className="mt-1.5 text-xs text-rose-600">{errors.doctorId}</p>}{doctorChoices.filter((doctor) => doctor.availability === 'AVAILABLE').length === 0 && <p className="mt-1.5 text-xs text-amber-700">No available doctors match this search.</p>}</div>
        <Input label="Visit reason or category" id="visit-category" value={form.visitCategory} error={errors.visitCategory} onChange={(event) => setValue('visitCategory', event.target.value)} maxLength={120} required />
      </>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Start" id="appointment-start" type="datetime-local" value={form.scheduledStart} error={errors.scheduledStart} onChange={(event) => setValue('scheduledStart', event.target.value)} required />
        <Input label="End" id="appointment-end" type="datetime-local" value={form.scheduledEnd} error={errors.scheduledEnd} onChange={(event) => setValue('scheduledEnd', event.target.value)} required />
      </div>
      {mode === 'create' && <p className="text-xs text-slate-500">Times use your device’s local timezone. Availability and conflicts are confirmed by the server.</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-4"><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : mode === 'reschedule' ? 'Save new time' : 'Book appointment'}</Button></div>
    </form>
  </Modal>;
}

function AppointmentDetails({ appointment, patient, doctor, canManage, busy, onClose, onCancel, onReschedule }) {
  const future = new Date(appointment.scheduledStart) > new Date();
  const changeable = ['SCHEDULED', 'CONFIRMED'].includes(appointment.status) && future;
  return <Modal open onClose={busy ? undefined : onClose} title="Appointment details" description={`Appointment ${appointment.id}`}>
    <div className="mb-5 flex items-center justify-between gap-2"><StatusBadge status={appointment.status.toLowerCase()}>{appointment.status.replaceAll('_', ' ')}</StatusBadge><span className="text-xs text-slate-400">Visit · {appointment.visitCategory}</span></div>
    <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      <div><dt className="text-xs font-semibold text-slate-400">Patient</dt><dd className="mt-1 text-sm text-ink">{patientName(patient)}</dd></div>
      <div><dt className="text-xs font-semibold text-slate-400">Doctor</dt><dd className="mt-1 text-sm text-ink">{doctorName(doctor)}</dd></div>
      <div><dt className="text-xs font-semibold text-slate-400">Starts</dt><dd className="mt-1 text-sm text-ink">{formatDateTime(appointment.scheduledStart)}</dd></div>
      <div><dt className="text-xs font-semibold text-slate-400">Ends</dt><dd className="mt-1 text-sm text-ink">{formatDateTime(appointment.scheduledEnd)}</dd></div>
      <div><dt className="text-xs font-semibold text-slate-400">Created</dt><dd className="mt-1 text-sm text-ink">{formatDateTime(appointment.createdAt)}</dd></div>
    </dl>
    {canManage && changeable && <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-line pt-4"><Button variant="secondary" onClick={onReschedule} disabled={busy}>Reschedule</Button><Button variant="danger" onClick={onCancel} disabled={busy}>{busy ? 'Cancelling…' : 'Cancel appointment'}</Button></div>}
  </Modal>;
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const canBook = ['ADMIN', 'RECEPTIONIST', 'PATIENT'].includes(user.role);
  const canManage = ['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT'].includes(user.role);
  const [filters, setFilters] = useState({ status: '', fromDate: '', toDate: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [optionsError, setOptionsError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [busyId, setBusyId] = useState('');
  const requestId = useRef(0);

  const loadAppointments = useCallback(async (currentPage = page, activeFilters = filters) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    if (activeFilters.fromDate && activeFilters.toDate && activeFilters.fromDate > activeFilters.toDate) {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setError('The end date must be the same as or later than the start date.');
      }
      return;
    }
    const params = { page: currentPage, limit: PAGE_SIZE };
    if (activeFilters.status) params.status = activeFilters.status;
    if (activeFilters.fromDate) params.from = new Date(`${activeFilters.fromDate}T00:00:00`).toISOString();
    if (activeFilters.toDate) {
      const exclusiveEnd = new Date(`${activeFilters.toDate}T00:00:00`);
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
      params.to = exclusiveEnd.toISOString();
    }
    try {
      const nextResult = await appointmentService.listAppointments(params);
      if (requestId.current === currentRequest) setResult(nextResult);
    } catch (requestError) {
      if (requestId.current === currentRequest) setError(requestError.userMessage || 'Unable to load appointments.');
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      const patientPromise = patientService.listPatients({ page: 1, limit: 100 }).then((response) => response.data);
      const doctorPromise = doctorService.listDoctors({ page: 1, limit: 100 }).then((response) => response.data);
      const [patientResult, doctorResult] = await Promise.allSettled([patientPromise, doctorPromise]);
      if (!active) return;
      if (patientResult.status === 'fulfilled') setPatients(patientResult.value);
      if (doctorResult.status === 'fulfilled') setDoctors(doctorResult.value);
      setOptionsError(optionsErrorMessage([patientResult, doctorResult]));
    }
    loadOptions();
    return () => { active = false; };
  }, []);

  const patientMap = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients]);
  const doctorMap = useMemo(() => new Map(doctors.map((doctor) => [doctor.id, doctor])), [doctors]);
  const appointments = result?.data || [];
  const pagination = result?.pagination;

  async function openDetails(appointmentId) {
    setBusyId(appointmentId);
    try { setDialog({ type: 'details', appointment: await appointmentService.getAppointment(appointmentId) }); }
    catch (requestError) { notify(requestError.userMessage || 'Unable to load appointment details.', 'error'); }
    finally { setBusyId(''); }
  }

  async function cancelSelected() {
    const appointment = dialog?.appointment;
    if (!appointment || !window.confirm('Cancel this appointment? This action cannot be undone.')) return;
    setBusyId(appointment.id);
    try {
      await appointmentService.cancelAppointment(appointment.id);
      notify('Appointment cancelled.');
      setDialog(null);
      loadAppointments();
    } catch (requestError) {
      notify(requestError.userMessage || 'Unable to cancel this appointment.', 'error');
    } finally { setBusyId(''); }
  }

  return <>
    <PageHeader eyebrow="CARE OPERATIONS" title="Appointments" description="Review schedules, filter visits, and manage bookings with server-checked availability." actions={canBook && <Button onClick={() => setDialog({ type: 'form', mode: 'create' })}><CalendarPlus size={16} />Book appointment</Button>} />
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_2px_12px_rgba(27,48,74,0.025)]">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:flex-wrap sm:items-end sm:px-5">
        <div className="mr-auto"><h2 className="font-display text-sm font-bold text-ink">Appointment schedule</h2><p className="mt-1 text-xs text-slate-500">{pagination ? `${pagination.total} appointment${pagination.total === 1 ? '' : 's'}` : 'Appointments available to your account'}</p></div>
        <div><label htmlFor="appointment-status-filter" className="mb-1 block text-[11px] font-semibold text-slate-500">Status</label><select id="appointment-status-filter" value={filters.status} onChange={(event) => { setFilters((current) => ({ ...current, status: event.target.value })); setPage(1); }} className="min-h-10 w-full rounded-xl border border-line bg-white px-3 text-sm sm:w-40"><option value="">All statuses</option>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ')}</option>)}</select></div>
        <div><label htmlFor="appointment-from-filter" className="mb-1 block text-[11px] font-semibold text-slate-500">From</label><input id="appointment-from-filter" type="date" value={filters.fromDate} onChange={(event) => { setFilters((current) => ({ ...current, fromDate: event.target.value })); setPage(1); }} className="min-h-10 w-full rounded-xl border border-line bg-white px-3 text-sm sm:w-40" /></div>
        <div><label htmlFor="appointment-to-filter" className="mb-1 block text-[11px] font-semibold text-slate-500">Through</label><input id="appointment-to-filter" type="date" value={filters.toDate} onChange={(event) => { setFilters((current) => ({ ...current, toDate: event.target.value })); setPage(1); }} className="min-h-10 w-full rounded-xl border border-line bg-white px-3 text-sm sm:w-40" /></div>
      </div>
      {optionsError && canBook && user.role !== 'PATIENT' && <p role="status" className="border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-xs text-amber-800">Booking options: {optionsError}</p>}
      {loading ? <div className="p-8"><LoadingIndicator label="Loading appointments" /></div> : error ? <ErrorState title="Could not load appointments" message={error} onRetry={() => loadAppointments()} /> : appointments.length === 0 ? <EmptyState icon={CalendarDays} title="No appointments found" description="Adjust the filters or book an appointment when a provider and patient are available." actionLabel={canBook ? 'Book appointment' : undefined} onAction={() => setDialog({ type: 'form', mode: 'create' })} /> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left">
          <thead><tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"><th className="px-5 py-3">Patient</th><th className="px-4 py-3">Doctor</th><th className="px-4 py-3">Date and time</th><th className="px-4 py-3">Visit</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Details</span></th></tr></thead>
          <tbody className="divide-y divide-slate-100">{appointments.map((appointment) => <tr key={appointment.id} className="hover:bg-slate-50/60">
            <td className="px-5 py-3.5"><p className="text-xs font-bold text-ink">{patientName(patientMap.get(appointment.patientId) || { id: appointment.patientId })}</p></td>
            <td className="px-4 py-3.5 text-xs text-slate-600">{doctorName(doctorMap.get(appointment.doctorId))}</td>
            <td className="px-4 py-3.5"><p className="text-xs font-semibold text-ink">{formatDateTime(appointment.scheduledStart)}</p><p className="mt-0.5 text-[11px] text-slate-400">Until {new Date(appointment.scheduledEnd).toLocaleTimeString([], { timeStyle: 'short' })}</p></td>
            <td className="px-4 py-3.5 text-xs text-slate-600">{appointment.visitCategory}</td>
            <td className="px-4 py-3.5"><StatusBadge status={appointment.status.toLowerCase()}>{appointment.status.replaceAll('_', ' ')}</StatusBadge></td>
            <td className="px-4 py-3.5 text-right"><Button size="sm" variant="secondary" onClick={() => openDetails(appointment.id)} disabled={busyId === appointment.id}>{busyId === appointment.id ? 'Loading…' : 'Details'}</Button></td>
          </tr>)}</tbody>
        </table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-slate-500"><span>Page {pagination?.page || page} of {Math.max(1, pagination?.totalPages || 1)} · {pagination?.total || 0} total</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><Button size="sm" variant="secondary" disabled={!pagination || page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>
      </>}
    </section>
    {dialog?.type === 'details' && <AppointmentDetails appointment={dialog.appointment} patient={patientMap.get(dialog.appointment.patientId)} doctor={doctorMap.get(dialog.appointment.doctorId)} canManage={canManage} busy={busyId === dialog.appointment.id} onClose={() => setDialog(null)} onCancel={cancelSelected} onReschedule={() => setDialog({ type: 'form', mode: 'reschedule', appointment: dialog.appointment })} />}
    {dialog?.type === 'form' && <AppointmentForm mode={dialog.mode} appointment={dialog.appointment} patients={patients} doctors={doctors.filter((doctor) => doctor.availability === 'AVAILABLE')} user={user} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); loadAppointments(); }} />}
  </>;
}
