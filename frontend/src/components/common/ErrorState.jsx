import { CircleAlert, RotateCcw } from 'lucide-react';
import Button from './Button.jsx';

export default function ErrorState({ title = 'Something went wrong', message = 'We could not load this information. Please try again.', onRetry }) {
  return (
    <div role="alert" className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600"><CircleAlert size={22} aria-hidden="true" /></div>
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-slate-500">{message}</p>
      {onRetry && <Button variant="secondary" className="mt-5" onClick={onRetry}><RotateCcw size={15} />Try again</Button>}
    </div>
  );
}
