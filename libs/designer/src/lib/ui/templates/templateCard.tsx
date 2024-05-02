import type { AppDispatch, RootState } from '../../core/state/templates/store';
import { changeCurrentTemplateName, loadTemplate } from '../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@fluentui/react-components';
import { openCreateWorkflowPanelView, openQuickViewPanelView } from '../../core/state/templates/panelSlice';

interface TemplateCardProps {
  templateName: string;
}

export const TemplateCard = ({ templateName }: TemplateCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const availableTemplates = useSelector((state: RootState) => state.manifest.availableTemplates);
  const templateDetails = availableTemplates?.[templateName];

  const onCreateWorkflowClick = () => {
    dispatch(changeCurrentTemplateName(templateName));
    dispatch(loadTemplate({}));
    dispatch(openCreateWorkflowPanelView());
  };

  const onQuickViewClick = () => {
    dispatch(changeCurrentTemplateName(templateName));
    dispatch(loadTemplate({}));
    dispatch(openQuickViewPanelView());
  };

  return (
    <div className="msla-template-card-wrapper">
      <div>Thumbnail: {templateDetails?.thumbnail}</div>
      {templateDetails?.images?.map((image, index) => (
        <div key={index}>Image to show: {image}</div>
      ))}
      <div>
        <b>{templateName}</b>
      </div>
      <div>{templateDetails?.description}</div>

      <Button appearance="outline" onClick={onCreateWorkflowClick} aria-label={''}>
        Create Workflow
      </Button>
      <Button appearance="subtle" onClick={onQuickViewClick} aria-label={''}>
        Quick View
      </Button>
    </div>
  );
};
