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
  { shouldClearDetails, previousTabId, isCreating, nextTabId, hasError, showCloseButton = true, onClosePanel }: CreateWorkflowTabProps
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS,
  title: intl.formatMessage({
    defaultMessage: 'Connections',
    id: 'ms6c93258169ba',
    description: 'The tab label for the monitoring connections tab on the create workflow panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Configure connections to authenticate and link your workflows with services and applications.',
    id: 'msa6aa6bc59609',
    description: 'An accessibility label that describes the objective of connections tab',
  }),
  hasError: hasError,
  content: <ConnectionsPanel />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'msd147f150cc64',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(nextTabId));
    },
    secondaryButtonText: previousTabId
      ? intl.formatMessage({
          defaultMessage: 'Previous',
          id: 'ms62e6bfe282ce',
          description: 'Button text for moving to the previous tab in the create workflow panel',
        })
      : intl.formatMessage({
          defaultMessage: 'Close',
          id: 'ms153accc4d1cf',
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
