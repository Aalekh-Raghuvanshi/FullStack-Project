import { LockKeyhole, Mail } from 'lucide-react';
import { Link } from 'react-router';
import AuthLayout from '../layouts/AuthLayout.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';

export default function LoginPage() {
  return (
    <AuthLayout>
      <section className="rounded-2xl border border-line bg-white p-7 shadow-[0_12px_50px_rgba(27,48,74,0.07)] sm:p-9">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-brand">STAFF PORTAL</p>
        <h1 className="text-center font-display text-2xl font-extrabold tracking-tight text-ink">Welcome back</h1>
        <p className="mb-7 mt-2 text-center text-sm text-slate-500">Sign in to your hospital workspace</p>
        <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
          <Input label="Work email" id="email" type="email" autoComplete="username" placeholder="name@hospital.com" leadingIcon={Mail} />
          <Input label="Password" id="password" type="password" autoComplete="current-password" placeholder="Enter your password" leadingIcon={LockKeyhole} />
          <div className="flex items-center justify-between gap-3 py-1">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" className="size-4 rounded border-slate-300 accent-brand" />Remember me</label>
            <button type="button" className="text-xs font-bold text-brand hover:text-brand-dark">Forgot password?</button>
          </div>
          <Button type="submit" className="w-full">Sign in</Button>
        </form>
        <p className="mt-5 rounded-xl bg-amber-50 px-3 py-2.5 text-center text-[11px] leading-5 text-amber-800">Authentication is a placeholder and is not connected yet.</p>
        <p className="mt-5 text-center text-xs text-slate-500">Return to <Link to="/dashboard" className="font-bold text-brand hover:text-brand-dark">dashboard preview</Link></p>
      </section>
      <p className="mt-6 text-center text-[11px] text-slate-400">Protected care operations · MediCore AI</p>
    </AuthLayout>
  );
}
