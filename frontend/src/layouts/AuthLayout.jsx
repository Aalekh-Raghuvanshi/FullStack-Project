import logo from '../assets/medicore-mark.svg';

export default function AuthLayout({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 flex justify-center">
          <a href="/dashboard" className="inline-flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            <img src={logo} alt="" className="size-11" />
            <span className="font-display text-xl font-extrabold tracking-tight text-ink">MediCore<span className="text-brand"> AI</span></span>
          </a>
        </div>
        {children}
      </div>
    </main>
  );
}
