import { ReceiptText } from 'lucide-react';
import ResourcePage from './ResourcePage.jsx';

export default function BillingPage() {
  return <ResourcePage title="Billing" description="Review billing activity, invoices, and payment status." icon={ReceiptText} />;
}
