import { Inbox } from 'lucide-react';
import Button from './Button.jsx';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, actionLabel, onAction }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon size={22} aria-hidden="true" /></div>
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">{description}</p>}
      {actionLabel && <Button className="mt-5" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
