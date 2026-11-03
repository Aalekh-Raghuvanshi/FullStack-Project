import { useState } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import AuthLayout from '../layouts/AuthLayout.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { user, signIn, sessionMessage, clearSessionMessage } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const notice = location.state?.notice;

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setRequestError('');
    clearSessionMessage();
    const nextErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!form.password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    try {
      await signIn({ email: form.email.trim(), password: form.password });
      const from = location.state?.from?.pathname;
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
    } catch (error) {
      setRequestError(error.userMessage || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <section className="rounded-2xl border border-line bg-white p-7 shadow-[0_12px_50px_rgba(27,48,74,0.07)] sm:p-9">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-brand">SECURE PORTAL</p>
        <h1 className="text-center font-display text-2xl font-extrabold tracking-tight text-ink">Welcome back</h1>
        <p className="mb-7 mt-2 text-center text-sm text-slate-500">Sign in to your MediCore AI workspace</p>
        {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">{notice}</p>}
        {(requestError || sessionMessage) && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{requestError || sessionMessage}</p>}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input label="Email" id="email" name="email" type="email" autoComplete="username" placeholder="name@hospital.com" leadingIcon={Mail} value={form.email} error={errors.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
          <Input label="Password" id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" leadingIcon={LockKeyhole} value={form.password} error={errors.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
          <Button type="submit" disabled={submitting} className="w-full">{submitting ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-500">New to MediCore AI? <Link to="/register" className="font-bold text-brand hover:text-brand-dark">Create a patient account</Link></p>
      </section>
      <p className="mt-6 text-center text-[11px] text-slate-400">Protected care operations · MediCore AI</p>
    </AuthLayout>
  );
}
