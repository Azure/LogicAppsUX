import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayConnections } from '../../../../templates/connections/displayConnections';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';

export const ConnectionsPanel: React.FC = () => {
  const { connections } = useSelector((state: RootState) => state.template);

  return <DisplayConnections connections={connections} />;
};

export const connectionsTab = (intl: IntlShape, dispatch: AppDispatch, nextTabId: string): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.CONNECTIONS,
  title: intl.formatMessage({
    defaultMessage: 'Connections',
    id: 'bJMlgW',
    description: 'The tab label for the monitoring connections tab on the create workflow panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Connections Tab',
    id: 'hsZ7em',
    description: 'An accessability label that describes the connections tab',
  }),
  visible: true,
  order: 0,
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
    primaryButtonDisabled: false,
  },
});
