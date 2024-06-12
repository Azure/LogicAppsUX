import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import type { IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { DisplayConnections } from '../../../../templates/connections/displayConnections';

export const ConnectionsPanel: React.FC = () => {
  const { connections, manifest } = useSelector((state: RootState) => state.template);
  const { subscriptionId, location } = useSelector((state: RootState) => state.workflow);

  return isNullOrUndefined(manifest) ? null : (
    <div>
      {connections ? (
        <DisplayConnections connections={connections} subscriptionId={subscriptionId} location={location} />
      ) : (
        <>PLACEHOLDER: no connections to be made</>
      )}
    </div>
  );
};

export const connectionsTab = (intl: IntlShape) => ({
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
  content: <ConnectionsPanel />,
  order: 0,
  icon: 'Info',
});
