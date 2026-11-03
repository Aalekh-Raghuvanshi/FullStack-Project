import { CalendarDays } from 'lucide-react';
import ResourcePage from './ResourcePage.jsx';

export default function AppointmentsPage() {
  return <ResourcePage title="Appointments" description="Coordinate upcoming visits and keep patient schedules moving smoothly." icon={CalendarDays} />;
}
