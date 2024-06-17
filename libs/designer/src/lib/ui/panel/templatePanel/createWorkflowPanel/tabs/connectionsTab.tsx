import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayConnections } from '../../../../templates/connections/displayConnections';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';

export const ConnectionsPanel: React.FC = () => {
  const { connections, manifest } = useSelector((state: RootState) => state.template);

  return isNullOrUndefined(manifest) ? null : (
    <div>
      Connections Tab Placeholder
      {connections ? <DisplayConnections connections={connections} /> : <>PLACEHOLDER: no connections to be made</>}
    </div>
  );
};

export const connectionsTab = (intl: IntlShape, dispatch: AppDispatch): TemplatePanelTab => ({
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
    primaryButtonText: 'Next',
    primaryButtonOnClick: () => {
      //TODO: revisit. if parameters is invisible, we should skip to the next visible tab
      dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.PARAMETERS));
    },
    primaryButtonDisabled: false,
    onClose: () => {},
  },
});
