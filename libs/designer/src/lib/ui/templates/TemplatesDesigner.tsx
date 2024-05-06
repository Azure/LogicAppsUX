import type { RootState } from '../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { TemplateCard } from './cards/templateCard';
import { TemplatePanel } from '../panel/templatePanel/templatePanel';

export const TemplatesDesigner = () => {
  const availableTemplatesNames = useSelector((state: RootState) => state.manifest.availableTemplateNames);

  return (
    <>
      <TemplatePanel />
      {availableTemplatesNames?.map((templateName: string) => (
        <TemplateCard key={templateName} templateName={templateName} />
      ))}
    </>
  );
};
