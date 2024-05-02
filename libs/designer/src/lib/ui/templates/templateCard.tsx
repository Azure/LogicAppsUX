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
  const templateManifest = availableTemplates?.[templateName];

  const onCreateWorkflowClick = () => {
    dispatch(changeCurrentTemplateName(templateName));
    dispatch(loadTemplate(templateManifest));
    dispatch(openCreateWorkflowPanelView());
  };

  const onQuickViewClick = () => {
    dispatch(changeCurrentTemplateName(templateName));
    dispatch(loadTemplate(templateManifest));
    dispatch(openQuickViewPanelView());
  };

  return (
    <div className="msla-template-card-wrapper">
      <div>Thumbnail: {templateManifest?.thumbnail}</div>
      {templateManifest?.images?.map((image, index) => (
        <div key={index}>Image to show: {image}</div>
      ))}
      <div>
        <b>{templateName}</b>
      </div>
      <div>{templateManifest?.description}</div>

      <Button appearance="outline" onClick={onCreateWorkflowClick} aria-label={''}>
        Create Workflow
      </Button>
      <Button appearance="subtle" onClick={onQuickViewClick} aria-label={''}>
        Quick View
      </Button>
    </div>
  );
};
