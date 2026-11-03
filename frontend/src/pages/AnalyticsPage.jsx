import { ChartNoAxesCombined } from 'lucide-react';
import ResourcePage from './ResourcePage.jsx';

export default function AnalyticsPage() {
  return <ResourcePage title="Analytics" description="Understand operational trends with reports across your hospital." icon={ChartNoAxesCombined} eyebrow="INSIGHTS" />;
}
