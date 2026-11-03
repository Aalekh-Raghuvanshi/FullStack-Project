import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import AuthLayout from '../layouts/AuthLayout.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import * as authService from '../services/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setRequestError('');
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (form.password.length < 12) nextErrors.password = 'Use at least 12 characters.';
    if (new TextEncoder().encode(form.password).length > 72) nextErrors.password = 'Password must be at most 72 bytes.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    try {
      await authService.register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      navigate('/login', { replace: true, state: { notice: 'Your patient account is ready. Sign in to continue.' } });
    } catch (error) {
      setRequestError(error.userMessage || 'Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <section className="rounded-2xl border border-line bg-white p-7 shadow-[0_12px_50px_rgba(27,48,74,0.07)] sm:p-9">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-brand">PATIENT PORTAL</p>
        <h1 className="text-center font-display text-2xl font-extrabold tracking-tight text-ink">Create an account</h1>
        <p className="mb-7 mt-2 text-center text-sm text-slate-500">Register to manage your care and appointments</p>
        {requestError && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{requestError}</p>}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input label="Full name" id="name" name="name" autoComplete="name" value={form.name} error={errors.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required maxLength={120} />
          <Input label="Email" id="email" name="email" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required maxLength={254} />
          <Input label="Password" id="password" name="password" type="password" autoComplete="new-password" value={form.password} error={errors.password} hint="Use at least 12 characters." onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
          <Button type="submit" disabled={submitting} className="w-full">{submitting ? 'Creating account…' : 'Create account'}</Button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">Already registered? <Link to="/login" className="font-bold text-brand hover:text-brand-dark">Sign in</Link></p>
      </section>
    </AuthLayout>
  );
}
