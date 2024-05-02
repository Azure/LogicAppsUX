import type { RootState } from '../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { DisplayConnections } from './connections/displayConnections';
import { TemplateCard } from './templateCard';
import { TemplatePanel } from '../panel/templatePanel/templatePanel';

export const TemplatesDesigner = () => {
  const availableTemplatesNames = useSelector((state: RootState) => state.manifest.availableTemplateNames);
  const templateConnections = useSelector((state: RootState) => state.template.connections);

  return (
    <>
      <TemplatePanel />
      {availableTemplatesNames?.map((templateName: string) => (
        <TemplateCard key={templateName} templateName={templateName} />
      ))}
      <div>CURRENTLY SELECTED TEMPLATE</div>
      {templateConnections ? <DisplayConnections connections={templateConnections} /> : <>no connections to be made</>}
    </>
  );
};
