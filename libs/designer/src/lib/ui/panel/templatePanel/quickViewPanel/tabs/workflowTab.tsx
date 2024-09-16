import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { useTheme } from '@fluentui/react';
import { useMemo } from 'react';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { closePanel, openCreateWorkflowPanelView } from '../../../../../core/state/templates/panelSlice';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';
import { LogEntryLevel, LoggerService, type Template } from '@microsoft/logic-apps-shared';

export const WorkflowPanel: React.FC = () => {
  const { manifest, images } = useSelector((state: RootState) => state.template);
  const { isInverted } = useTheme();
  const imageName = useMemo(() => (isInverted ? images?.dark : images?.light), [isInverted, images]);

  return imageName ? (
    <div className="msla-template-workflow-preview">
      <img className="msla-template-workflow-preview-image" src={imageName} alt={manifest?.title} />
    </div>
  ) : null;
};

export const workflowTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { templateId, workflowAppName }: Template.TemplateContext
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.WORKFLOW_VIEW,
  title: intl.formatMessage({
    defaultMessage: 'Workflow',
    id: 'lFWXhc',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  hasError: false,
  content: <WorkflowPanel />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Use this template',
      id: '5szzYP',
      description: 'Button text to create workflow from this template',
    }),
    primaryButtonOnClick: () => {
      LoggerService().log({
        level: LogEntryLevel.Trace,
        area: 'Templates.overviewTab',
        message: 'Template create button clicked',
        args: [templateId, workflowAppName],
      });
      dispatch(openCreateWorkflowPanelView());
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Close',
      id: 'FTrMxN',
      description: 'Button text for closing the panel',
    }),
    secondaryButtonOnClick: () => {
      dispatch(closePanel());
      dispatch(clearTemplateDetails());
    },
  },
});
