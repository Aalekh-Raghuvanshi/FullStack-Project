import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, UserPlus, UsersRound } from 'lucide-react';
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
import * as patientService from '../services/patients.js';

const PAGE_SIZE = 10;
const blankPatient = { firstName: '', lastName: '', dateOfBirth: '', gender: '', phone: '', email: '', address: '', emergencyContactName: '', emergencyContactPhone: '' };
const inputClass = 'min-h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10';

function displayDate(value) { return value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString() : '—'; }
function patientName(patient) { return [patient.firstName, patient.lastName].filter(Boolean).join(' '); }

function PatientForm({ mode, patient, userRole, onClose, onSaved }) {
  const notify = useNotify();
  const selfEdit = userRole === 'PATIENT';
  const [form, setForm] = useState(() => ({ ...blankPatient, ...patient, dateOfBirth: patient?.dateOfBirth?.slice(0, 10) || '' }));
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);

  function setValue(name, value) { setForm((current) => ({ ...current, [name]: value })); }
  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!selfEdit && !form.firstName.trim()) nextErrors.firstName = 'Enter the patient’s first name.';
    if (!selfEdit && form.dateOfBirth && form.dateOfBirth > new Date().toISOString().slice(0, 10)) nextErrors.dateOfBirth = 'Date of birth cannot be in the future.';
    if (selfEdit && !form.email.trim()) nextErrors.email = 'Your linked patient account must keep an email address.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    setErrors(nextErrors);
    setRequestError('');
    if (Object.keys(nextErrors).length) return;

    const optionalFields = selfEdit
      ? ['phone', 'email', 'address', 'emergencyContactName', 'emergencyContactPhone']
      : ['dateOfBirth', 'gender', 'phone', 'email', 'address', 'emergencyContactName', 'emergencyContactPhone'];
    const payload = Object.fromEntries(optionalFields.map((key) => [key, form[key]?.trim() || null]));
    if (!selfEdit) {
      payload.firstName = form.firstName.trim();
      payload.lastName = form.lastName.trim() || null;
    }
    setSaving(true);
    try {
      const saved = mode === 'create'
        ? await patientService.createPatient(payload)
        : await patientService.updatePatient(patient.id, payload);
      notify(mode === 'create' ? 'Patient record created.' : 'Patient record updated.');
      onSaved(saved);
    } catch (error) {
      setRequestError(error.userMessage || 'Unable to save this patient record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={saving ? undefined : onClose} title={mode === 'create' ? 'Add patient' : selfEdit ? 'Update contact information' : 'Edit patient'} description={selfEdit ? 'Update your contact details.' : 'Patient details are validated by the care record service.'}>
      <form onSubmit={submit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {requestError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{requestError}</p>}
        {!selfEdit && <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" id="patient-first-name" value={form.firstName} onChange={(event) => setValue('firstName', event.target.value)} error={errors.firstName} required maxLength={120} />
          <Input label="Last name" id="patient-last-name" value={form.lastName || ''} onChange={(event) => setValue('lastName', event.target.value)} maxLength={120} />
          <Input label="Date of birth" id="patient-dob" type="date" value={form.dateOfBirth || ''} onChange={(event) => setValue('dateOfBirth', event.target.value)} error={errors.dateOfBirth} max={new Date().toISOString().slice(0, 10)} />
          <div><label htmlFor="patient-gender" className="mb-1.5 block text-sm font-semibold text-slate-700">Gender</label><input id="patient-gender" className={inputClass} maxLength={80} value={form.gender || ''} onChange={(event) => setValue('gender', event.target.value)} /></div>
        </div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" id="patient-email" type="email" value={form.email || ''} onChange={(event) => setValue('email', event.target.value)} error={errors.email} maxLength={254} required={selfEdit} />
          <Input label="Phone" id="patient-phone" type="tel" value={form.phone || ''} onChange={(event) => setValue('phone', event.target.value)} maxLength={40} />
        </div>
        {!selfEdit && <Input label="Address" id="patient-address" value={form.address || ''} onChange={(event) => setValue('address', event.target.value)} maxLength={500} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Emergency contact" id="patient-emergency-name" value={form.emergencyContactName || ''} onChange={(event) => setValue('emergencyContactName', event.target.value)} maxLength={160} />
          <Input label="Emergency contact phone" id="patient-emergency-phone" type="tel" value={form.emergencyContactPhone || ''} onChange={(event) => setValue('emergencyContactPhone', event.target.value)} maxLength={40} />
        </div>
        {selfEdit && <Input label="Address" id="patient-address" value={form.address || ''} onChange={(event) => setValue('address', event.target.value)} maxLength={500} />}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : mode === 'create' ? 'Create patient' : 'Save changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function PatientDetails({ patient, onClose, onEdit }) {
  const fields = [
    ['Date of birth', displayDate(patient.dateOfBirth)], ['Gender', patient.gender || '—'],
    ['Email', patient.email || '—'], ['Phone', patient.phone || '—'],
    ['Address', patient.address || '—'], ['Emergency contact', patient.emergencyContactName || '—'],
    ['Emergency phone', patient.emergencyContactPhone || '—'],
  ];
  return (
    <Modal open onClose={onClose} title={patientName(patient) || 'Patient record'} description={`Patient number ${patient.patientNumber}`}>
      <div className="mb-5 flex items-center justify-between"><StatusBadge status={patient.isActive ? 'active' : 'cancelled'}>{patient.isActive ? 'Active record' : 'Inactive record'}</StatusBadge><span className="text-xs text-slate-400">Created {new Date(patient.createdAt).toLocaleDateString()}</span></div>
      <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm text-ink">{value}</dd></div>)}</dl>
      {onEdit && <div className="mt-6 flex justify-end border-t border-line pt-4"><Button onClick={onEdit}>Edit record</Button></div>}
    </Modal>
  );
}

export default function PatientsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const canCreate = ['ADMIN', 'RECEPTIONIST'].includes(user.role);
  const canEditAll = ['ADMIN', 'RECEPTIONIST'].includes(user.role);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const requestId = useRef(0);

  const loadPatients = useCallback(async (query = search, currentPage = page) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const nextResult = await patientService.listPatients({ page: currentPage, limit: PAGE_SIZE, ...(query.trim() ? { search: query.trim() } : {}) });
      if (requestId.current === currentRequest) setResult(nextResult);
    } catch (requestError) {
      if (requestId.current === currentRequest) setError(requestError.userMessage || 'Unable to load patient records.');
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { loadPatients(); }, 250);
    return () => { window.clearTimeout(timeout); requestId.current += 1; };
  }, [loadPatients]);

  async function openDetails(patientId) {
    setDetailLoading(true);
    try {
      setDialog({ type: 'details', patient: await patientService.getPatient(patientId) });
    } catch (requestError) {
      notify(requestError.userMessage || 'Unable to load this patient record.', 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  const patients = result?.data || [];
  const pagination = result?.pagination;
  const canEditSelected = dialog?.patient && (canEditAll || (user.role === 'PATIENT' && dialog.patient.id === user.patientProfileId));
  const rowLabel = user.role === 'PATIENT' ? 'My patient record' : 'Patient records';

  return <>
    <PageHeader eyebrow="CARE OPERATIONS" title="Patients" description="Search patient records, review demographics, and maintain contact details." actions={canCreate && <Button onClick={() => setDialog({ type: 'form', mode: 'create' })}><UserPlus size={16} />Add patient</Button>} />
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_2px_12px_rgba(27,48,74,0.025)]">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 className="font-display text-sm font-bold text-ink">{rowLabel}</h2><p className="mt-1 text-xs text-slate-500">{pagination ? `${pagination.total} record${pagination.total === 1 ? '' : 's'}` : 'Records available to your account'}</p></div>
        <label className="relative w-full sm:max-w-xs"><span className="sr-only">Search patients</span><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, email, or patient #" className="min-h-10 w-full rounded-xl border border-line bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10" /></label>
      </div>
      {loading ? <div className="p-8"><LoadingIndicator label="Loading patient records" /></div> : error ? <ErrorState title="Could not load patients" message={error} onRetry={() => loadPatients()} /> : patients.length === 0 ? <EmptyState icon={UsersRound} title={search ? 'No matching patients' : 'No patient records yet'} description={search ? 'Try another name, email, phone number, or patient number.' : 'Patient records available to your account will appear here.'} actionLabel={canCreate && !search ? 'Add patient' : undefined} onAction={() => setDialog({ type: 'form', mode: 'create' })} /> : <>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left">
          <thead><tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400"><th className="px-5 py-3">Patient</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Date of birth</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">View record</span></th></tr></thead>
          <tbody className="divide-y divide-slate-100">{patients.map((patient) => <tr key={patient.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => openDetails(patient.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetails(patient.id); } }} tabIndex={0} aria-label={`View ${patientName(patient)} patient record`}>
            <td className="px-5 py-3.5"><p className="text-sm font-bold text-ink">{patientName(patient)}</p><p className="mt-0.5 text-[11px] text-slate-400">{patient.patientNumber}</p></td>
            <td className="px-4 py-3.5"><p className="text-xs text-slate-700">{patient.email || 'No email'}</p><p className="mt-0.5 text-[11px] text-slate-400">{patient.phone || 'No phone'}</p></td>
            <td className="px-4 py-3.5 text-xs text-slate-600">{displayDate(patient.dateOfBirth)}</td>
            <td className="px-4 py-3.5"><StatusBadge status={patient.isActive ? 'active' : 'cancelled'}>{patient.isActive ? 'Active' : 'Inactive'}</StatusBadge></td>
            <td className="px-4 py-3.5 text-right text-xs font-bold text-brand">View</td>
          </tr>)}</tbody>
        </table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-slate-500"><span>Page {pagination?.page || page} of {Math.max(1, pagination?.totalPages || 1)} · {pagination?.total || 0} total</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><Button size="sm" variant="secondary" disabled={!pagination || page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>
      </>}
    </section>
    {detailLoading && <div className="mt-4"><LoadingIndicator label="Loading patient details" /></div>}
    {dialog?.type === 'details' && <PatientDetails patient={dialog.patient} onClose={() => setDialog(null)} onEdit={canEditSelected ? () => setDialog({ type: 'form', mode: 'edit', patient: dialog.patient }) : null} />}
    {dialog?.type === 'form' && <PatientForm mode={dialog.mode} patient={dialog.patient} userRole={user.role} onClose={() => setDialog(null)} onSaved={(saved) => { setDialog(null); loadPatients(); if (dialog.mode === 'edit') setDialog({ type: 'details', patient: saved }); }} />}
  </>;
}
