import { CircleHelp } from 'lucide-react';
import { Link } from 'react-router';
import EmptyState from '../components/common/EmptyState.jsx';

export default function NotFoundPage() {
  return (
    <section className="rounded-2xl border border-line bg-white">
      <EmptyState icon={CircleHelp} title="Page not found" description="The page you’re looking for doesn’t exist or may have moved." />
      <div className="-mt-8 pb-8 text-center"><Link to="/dashboard" className="text-sm font-bold text-brand hover:text-brand-dark">Back to dashboard</Link></div>
    </section>
  );
}
