import { Stethoscope } from 'lucide-react';
import ResourcePage from './ResourcePage.jsx';

export default function DoctorsPage() {
  return <ResourcePage title="Doctors" description="Explore provider profiles, specialties, and care-team availability." icon={Stethoscope} />;
}
