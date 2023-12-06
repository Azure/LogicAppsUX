import { ConnectionEntry } from './connectionEntry';
import { Text } from '@fluentui/react';
import { AccordionHeader, AccordionPanel } from '@fluentui/react-components';
import { getConnectorCategoryString } from '@microsoft/designer-ui';
import { fallbackConnectorIconUrl, isBuiltInConnector } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

export interface ConnectorConnectionsCardProps {
  connectorId: string;
  title: string;
  brandColor?: string;
  iconUri?: string;
  connectionRefs?: Record<string, any>;
}

export const ConnectorConnectionsCard: React.FC<ConnectorConnectionsCardProps> = ({
  connectorId,
  title,
  brandColor,
  iconUri,
  connectionRefs = {},
}) => {
  const isBuiltIn = isBuiltInConnector(connectorId);
  const category = getConnectorCategoryString(connectorId);

  const intl = useIntl();
  const connectionsPanelHeaderText = intl.formatMessage(
    {
      defaultMessage: '{connectorName} connections',
      description: 'Header for the connections panel',
    },
    { connectorName: title }
  );

  return (
    <div key={connectorId} className="msla-connector-connections-card">
      <AccordionHeader>
        <div className="msla-connector-connections-card-header">
          <img className="msla-connector-connections-card-icon" src={fallbackConnectorIconUrl(iconUri)} alt="" />
          <Text className="msla-connector-connections-card-title" variant={'large'}>
            {connectionsPanelHeaderText}
          </Text>
          {isBuiltIn && <Text className="msla-psuedo-badge">{category}</Text>}
        </div>
      </AccordionHeader>
      <AccordionPanel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(connectionRefs).map(([refId, connectionReference]) => (
            <ConnectionEntry
              key={refId}
              connectorId={connectorId}
              refId={refId}
              connectionReference={connectionReference}
              iconUri={iconUri}
              brandColor={brandColor}
            />
          ))}
        </div>
      </AccordionPanel>
    </div>
  );
};
