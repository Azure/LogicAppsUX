import type { RootState } from '../../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { useIntl, type IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { getDisplayNameFromConnector, getIconUriFromConnector, isArmResourceId } from '@microsoft/logic-apps-shared';
import { Body1Strong } from '@fluentui/react-components';
import { useConnector } from '../../../../../core/state/connection/connectionSelector';
import { useConnectionsForConnector } from '../../../../../core/queries/connections';

export const OverviewPanel: React.FC = () => {
  const { connections } = useSelector((state: RootState) => state.template);
  const { subscriptionId, location } = useSelector((state: RootState) => state.workflow);

  const intl = useIntl();
  const connectionsTitle = intl.formatMessage({
    defaultMessage: 'Connections included in this template',
    id: 'crzL9d',
    description: 'Connections Display Title',
  });
  const prerequisitesTitle = intl.formatMessage({
    defaultMessage: 'Prerequisites',
    id: 'KfEojk',
    description: 'Prerequisites Title',
  });
  const detailsTitle = intl.formatMessage({
    defaultMessage: 'Details',
    id: 'D3QvcW',
    description: 'Details Title',
  });

  const ConnectionListItem = ({ blankConnectorId }: { blankConnectorId: string }) => {
    // TODO: implement this to work for service provider connectors too
    const connectorId =
      isArmResourceId(blankConnectorId) && subscriptionId && location
        ? blankConnectorId.replace('#subscription#', subscriptionId).replace('#location#', location)
        : blankConnectorId;
    const { data: connector } = useConnector(connectorId);
    const iconUri = getIconUriFromConnector(connector);
    const displayName = getDisplayNameFromConnector(connector);
    const { data: connection } = useConnectionsForConnector(connectorId);
    const hasExistingConnection = connection && connection.length > 0;
    const connectorKind = 'In App'; // default to In App for now

    return (
      <div>
        <img className="msla-action-icon" src={iconUri} />
        <Body1Strong className="msla-flex-header-title">{displayName}</Body1Strong>
        <p>
          {connectorKind} {hasExistingConnection ? 'Connected' : 'Not Connected'}
        </p>
      </div>
    );
  };

  return (
    <div>
      {connections && (
        <div>
          <b>{connectionsTitle}</b>
          {Object.keys(connections).map((connectionKey, index) => (
            <ConnectionListItem key={index} blankConnectorId={connections[connectionKey]?.id} />
          ))}
        </div>
      )}

      <div>
        <b>{prerequisitesTitle}</b>
        <p>This implementation template has the following dependencies:</p>
        <li>Jack Henry SilverLake instance </li>
        <li>Jack Henry SilverLake instance </li>
        <p>
          Underlying all IT architectures are core systems of records that are often not readily available due to complexity and
          connectivity concerns. System APIs provide a means of hiding that complexity from the user while exposing data and providing
          downstream insulation from any interface changes or rationalization of those systems. This API provides an implementation best
          practice to expose order data from CRM systems like Salesforce via a set of RESTful services, making it easy to consume within an
          enterprise.
        </p>
      </div>

      <div>
        <b>{detailsTitle}</b>
        <p>Solution type: Workflow</p>
        <p>Trigger type: Request</p>
      </div>
    </div>
  );
};

export const overviewTab = (intl: IntlShape) => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.OVERVIEW,
  title: intl.formatMessage({
    defaultMessage: 'Overview',
    id: '+YyHKB',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Overview Tab',
    id: 'EJj4E0',
    description: 'An accessability label that describes the oveview tab',
  }),
  visible: true,
  content: <OverviewPanel />,
  order: 1,
  icon: 'Info',
});
