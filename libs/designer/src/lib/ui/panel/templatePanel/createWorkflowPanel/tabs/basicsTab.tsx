import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import constants from '../../../../../common/constants';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';
import { SingleWorkflowBasics } from '../../../../templates/basics/singleworkflow';
import type { IntlShape } from 'react-intl';
import { MultiWorkflowBasics } from '../../../../templates/basics/multiworkflow';

export const WorkflowBasics = () => {
  const { workflows } = useSelector((state: RootState) => state.template);
  return Object.keys(workflows).length === 1 ? <SingleWorkflowBasics workflowId={Object.keys(workflows)[0]} /> : <MultiWorkflowBasics />;
};

export const basicsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { shouldClearDetails, isCreating, nextTabId, hasError, onClosePanel, showCloseButton = true }: CreateWorkflowTabProps
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.BASIC,
  title: intl.formatMessage({
    defaultMessage: 'Basics',
    id: 'b1572f706171',
    description: 'The tab label for the monitoring name and state tab on the create workflow panel',
  }),
  hasError: hasError,
  content: <WorkflowBasics />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'd147f150cc64',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(nextTabId));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Close',
      id: '153accc4d1cf',
      description: 'Button text for closing the panel',
    }),
    secondaryButtonOnClick: () => {
      dispatch(closePanel());

      if (shouldClearDetails) {
        dispatch(clearTemplateDetails());
      }

      onClosePanel?.();
    },
    secondaryButtonDisabled: !showCloseButton || isCreating,
  },
});
