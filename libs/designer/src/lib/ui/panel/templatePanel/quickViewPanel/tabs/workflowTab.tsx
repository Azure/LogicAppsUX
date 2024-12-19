import type { AppDispatch } from '../../../../../core/state/templates/store';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { useTheme } from '@fluentui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { closePanel, openCreateWorkflowPanelView } from '../../../../../core/state/templates/panelSlice';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';
import { LogEntryLevel, LoggerService, type Template } from '@microsoft/logic-apps-shared';
import { useWorkflowTemplate } from '../../../../../core/state/templates/templateselectors';
// import { Image } from '@fluentui/react-components';

export const WorkflowPanel = ({ workflowId }: { workflowId: string }) => {
  const { manifest, images } = useWorkflowTemplate(workflowId);
  const { isInverted } = useTheme();
  const imageName = useMemo(() => (isInverted ? images?.dark : images?.light), [isInverted, images]);
  const ref = useRef<HTMLDivElement>(null);

  const [height, setHeight] = useState(0); // State to store height

  useEffect(() => {
    // Calculate height after component mounts
    if (ref.current) {
      const calculatedHeight = ref.current.getBoundingClientRect().height;
      setHeight(calculatedHeight); // Store the height in state
    }

    // Optional: Add resize listener if height might change dynamically
    const handleResize = () => {
      if (ref.current) {
        setHeight(ref.current.getBoundingClientRect().height);
        console.log('--ref.current.getBoundingClientRect().height ', ref.current.getBoundingClientRect().height);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [workflowId]); // Empty dependency array to run only on mount

  return imageName ? (
    <div
      className="msla-template-workflow-preview"
      style={{ border: '1px solid purple', background: 'green', overflow: 'hidden', height: `${height}px` }}
    >
      <div ref={ref}>
        <img
          className="msla-template-workflow-preview-image1"
          style={{ width: '100%', height: 'auto' }}
          src={imageName}
          alt={manifest?.title}
        />
      </div>
    </div>
  ) : null;
};

export const workflowTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  workflowId: string,
  clearDetailsOnClose: boolean,
  onPrimaryButtonClick: (() => void) | undefined,
  { templateId, workflowAppName, isMultiWorkflow }: Template.TemplateContext
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.WORKFLOW_VIEW,
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
        level: LogEntryLevel.Verbose,
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
    },
  },
});
