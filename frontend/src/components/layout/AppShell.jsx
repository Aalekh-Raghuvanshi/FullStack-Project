import { useState } from 'react';
import { Outlet } from 'react-router';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <Sidebar open={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      <div className="min-h-screen lg:pl-[264px]">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main id="main-content" className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
