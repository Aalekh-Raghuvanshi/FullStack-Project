import PageHeader from '../components/common/PageHeader.jsx';
import ModulePlaceholder from '../components/common/ModulePlaceholder.jsx';

export default function ResourcePage({ title, description, icon: Icon, eyebrow = 'CARE OPERATIONS' }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <ModulePlaceholder title={title} description={description} icon={Icon} />
    </>
  );
}
