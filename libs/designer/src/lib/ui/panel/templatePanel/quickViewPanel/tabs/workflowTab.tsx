import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { useTheme } from '@fluentui/react';
import { useMemo } from 'react';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import { closePanel, openPanelView, TemplatePanelView } from '../../../../../core/state/templates/panelSlice';
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
  { templateId, workflowAppName, isMultiWorkflow, showCreate, showCloseButton }: Template.TemplateContext,
  onClose?: () => void
): TemplateTabProps => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.WORKFLOW_VIEW,
  title: intl.formatMessage({
    defaultMessage: 'Workflow',
    id: 'lFWXhc',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  tabStatusIcon: undefined,
  content: <WorkflowPanel workflowId={workflowId} />,
  footerContent: {
    buttonContents: [
      {
        type: 'action',
        text: intl.formatMessage({
          defaultMessage: 'Use this template',
          id: '5szzYP',
          description: 'Button text to create workflow from this template',
        }),
        appearance: 'primary',
        onClick: () => {
          LoggerService().log({
            level: LogEntryLevel.Trace,
            area: 'Templates.overviewTab',
            message: 'Template create button clicked',
            args: [templateId, workflowAppName, `isMultiWorkflowTemplate:${isMultiWorkflow}`],
          });
          dispatch(openPanelView({ panelView: TemplatePanelView.CreateWorkflow }));
          onPrimaryButtonClick?.();
        },
        hide: !showCreate,
      },
      {
        type: 'action',
        text: intl.formatMessage({
          defaultMessage: 'Close',
          id: 'FTrMxN',
          description: 'Button text for closing the panel',
        }),
        onClick: () => {
          dispatch(closePanel());
          if (clearDetailsOnClose) {
            dispatch(clearTemplateDetails());
          }
          onClose?.();
        },
        disabled: !showCloseButton,
      },
    ],
  },
});
