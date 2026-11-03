import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button.jsx';

export default function Modal({ open, onClose, title, description, children, labelledBy = 'modal-title' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const getFocusable = () => dialogRef.current?.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || [];
    getFocusable()[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl outline-none">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={labelledBy} className="font-display text-lg font-bold text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close dialog" onClick={onClose}><X size={18} /></Button>
        </div>
        {children}
      </section>
    </div>
  );
}
