import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { changeCurrentTemplateName, loadTemplate } from '../../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { openQuickViewPanelView } from '../../../core/state/templates/panelSlice';

interface TemplateCardProps {
  templateName: string;
}

export const TemplateCard = ({ templateName }: TemplateCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const availableTemplates = useSelector((state: RootState) => state.manifest.availableTemplates);
  const templateManifest = availableTemplates?.[templateName];

  const onCardClick = () => {
    dispatch(changeCurrentTemplateName(templateName));
    dispatch(loadTemplate(templateManifest));
    dispatch(openQuickViewPanelView());
  };

  return (
    <div className="msla-template-card-wrapper" onClick={onCardClick}>
      <div>
        <b>{templateName}</b>
      </div>
      <div>{templateManifest?.description}</div>
    </div>
  );
};
