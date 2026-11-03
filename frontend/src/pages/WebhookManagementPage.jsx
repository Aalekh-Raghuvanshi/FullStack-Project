import { Webhook } from 'lucide-react';
import ResourcePage from './ResourcePage.jsx';

export default function WebhookManagementPage() {
  return <ResourcePage title="Webhook Management" description="Configure and monitor event destinations for connected systems." icon={Webhook} eyebrow="INTEGRATIONS" />;
}
