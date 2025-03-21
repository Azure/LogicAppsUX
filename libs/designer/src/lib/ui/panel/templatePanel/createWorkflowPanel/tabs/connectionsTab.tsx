import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';
import { WorkflowConnections } from '../../../../templates/connections/workflowconnections';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';

export const ConnectionsPanel: React.FC = () => {
  const { connections } = useSelector((state: RootState) => state.template);

  return <WorkflowConnections connections={connections} />;
};

export const connectionsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  {
    disabled,
    shouldClearDetails,
    previousTabId,
    isCreating,
    nextTabId,
    hasError,
    showCloseButton = true,
    onClosePanel,
  }: CreateWorkflowTabProps
): TemplatePanelTab => ({
  id: constants.TEMPLATE_TAB_NAMES.CONNECTIONS,
  disabled,
  title: intl.formatMessage({
    defaultMessage: 'Connections',
    id: 'bJMlgW',
    description: 'The tab label for the monitoring connections tab on the create workflow panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Configure connections to authenticate and link your workflows with services and applications.',
    id: 'pqprxZ',
    description: 'An accessibility label that describes the objective of connections tab',
  }),
  hasError: hasError,
  content: <ConnectionsPanel />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: '0UfxUM',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(nextTabId));
    },
    secondaryButtonText: previousTabId
      ? intl.formatMessage({
          defaultMessage: 'Previous',
          id: 'Yua/4o',
          description: 'Button text for moving to the previous tab in the create workflow panel',
        })
      : intl.formatMessage({
          defaultMessage: 'Close',
          id: 'FTrMxN',
          description: 'Button text for closing the panel',
        }),
    secondaryButtonOnClick: () => {
      if (previousTabId) {
        dispatch(selectPanelTab(previousTabId));
      } else {
        dispatch(closePanel());

        if (shouldClearDetails) {
          dispatch(clearTemplateDetails());
        }

        onClosePanel?.();
      }
    },
    secondaryButtonDisabled: (!previousTabId && !showCloseButton) || isCreating,
  },
});
