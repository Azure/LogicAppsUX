import { ConnectionEntry } from './connectionEntry';
import { DisconnectedEntry } from './disconnectedEntry';
import { Text, AccordionHeader, AccordionPanel, Spinner, Badge } from '@fluentui/react-components';
import { getConnectorCategoryString } from '@microsoft/designer-ui';
import { fallbackConnectorIconUrl, isBuiltInConnector } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

export interface ConnectorConnectionsCardProps {
  connectorId: string;
  title: string;
  brandColor?: string;
  iconUri?: string;
  connectionRefs?: Record<string, any>;
  disconnectedNodes?: string[];
  isLoading?: boolean;
}

export const ConnectorConnectionsCard: React.FC<ConnectorConnectionsCardProps> = ({
  connectorId,
  title,
  brandColor,
  iconUri,
  connectionRefs = {},
  disconnectedNodes = [],
  isLoading = false,
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
        <div className="msla-flex-header">
          {isLoading ? (
            <div className="msla-action-icon large">
              <Spinner size="extra-small" style={{ margin: '4px' }} />
            </div>
          ) : (
            <>
              <img className="msla-action-icon large" src={fallbackConnectorIconUrl(iconUri)} alt="" />
              <Text size={300} weight="semibold" className="msla-flex-header-title">
                {connectionsPanelHeaderText}
              </Text>
              {isBuiltIn && (
                <Badge shape="rounded" appearance="outline">
                  {category}
                </Badge>
              )}
            </>
          )}
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
          {disconnectedNodes?.length > 0 && (
            <DisconnectedEntry nodeIds={disconnectedNodes} connectorId={connectorId} iconUri={iconUri} brandColor={brandColor} />
          )}
        </div>
      </AccordionPanel>
    </div>
  );
};
