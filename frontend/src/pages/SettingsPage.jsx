import { Settings } from 'lucide-react';
import ResourcePage from './ResourcePage.jsx';

export default function SettingsPage() {
  return <ResourcePage title="Settings" description="Manage workspace preferences and hospital configuration." icon={Settings} eyebrow="WORKSPACE" />;
}
