import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { useTheme } from '@fluentui/react';
import { useMemo } from 'react';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import { closePanel, openCreateWorkflowPanelView } from '../../../../../core/state/templates/panelSlice';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';
import { LogEntryLevel, LoggerService, type Template } from '@microsoft/logic-apps-shared';
import { useWorkflowTemplate } from '../../../../../core/state/templates/templateselectors';

export const WorkflowPanel = ({ workflowId }: { workflowId: string }) => {
  const workflowTemplate = useWorkflowTemplate(workflowId);
  const manifest = useMemo(() => workflowTemplate?.manifest, [workflowTemplate]);
  const images = useMemo(() => workflowTemplate?.images, [workflowTemplate]);
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
  workflowId: string,
  clearDetailsOnClose: boolean,
  onPrimaryButtonClick: (() => void) | undefined,
  { templateId, workflowAppName, isMultiWorkflow }: Template.TemplateContext,
  onClose?: () => void
): TemplateTabProps => ({
  id: constants.TEMPLATE_TAB_NAMES.WORKFLOW_VIEW,
  title: intl.formatMessage({
    defaultMessage: 'Workflow',
    id: 'lFWXhc',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  hasError: false,
  content: <WorkflowPanel workflowId={workflowId} />,
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
        args: [templateId, workflowAppName, `isMultiWorkflowTemplate:${isMultiWorkflow}`],
      });
      dispatch(openCreateWorkflowPanelView());
      onPrimaryButtonClick?.();
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Close',
      id: 'FTrMxN',
      description: 'Button text for closing the panel',
    }),
    secondaryButtonOnClick: () => {
      dispatch(closePanel());
      if (clearDetailsOnClose) {
        dispatch(clearTemplateDetails());
      }
      onClose?.();
    },
  },
});
