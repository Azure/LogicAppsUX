import type { AppDispatch, RootState } from '../../core/state/templates/store';
import { changeCurrentTemplateName, loadTemplate } from '../../core/state/templates/templateSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@fluentui/react-components';
import { openCreateWorkflowPanelView, openQuickViewPanelView } from '../../core/state/templates/panelSlice';
import { useIntl } from 'react-intl';

interface TemplateCardProps {
  templateName: string;
}

export const TemplateCard = ({ templateName }: TemplateCardProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const availableTemplates = useSelector((state: RootState) => state.manifest.availableTemplates);
  const templateManifest = availableTemplates?.[templateName];

  const intlText = {
    CREATE_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Create Workflow',
      id: 'tsPPWB',
      description: 'Button text to create workflow from this template',
    }),
    QUICK_VIEW: intl.formatMessage({
      defaultMessage: 'Quick View',
      id: 'm1BGgQ',
      description: 'Button text to open quick view panel to display more information',
    }),
  };

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
      <div>
        <b>{templateName}</b>
      </div>
      <div>{templateManifest?.description}</div>

      <Button appearance="outline" onClick={onCreateWorkflowClick} aria-label={''}>
        {intlText.CREATE_WORKFLOW}
      </Button>
      <Button appearance="subtle" onClick={onQuickViewClick} aria-label={''}>
        {intlText.QUICK_VIEW}
      </Button>
    </div>
  );
};
