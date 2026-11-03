import { BrainCircuit } from 'lucide-react';
import ResourcePage from './ResourcePage.jsx';

export default function PatientIntelligencePage() {
  return <ResourcePage title="Patient Intelligence" description="Prepare a workspace for patient insights and decision-support summaries." icon={BrainCircuit} eyebrow="INTELLIGENCE" />;
}
