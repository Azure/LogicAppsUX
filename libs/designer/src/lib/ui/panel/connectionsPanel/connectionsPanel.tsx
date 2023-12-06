import { useConnectionMapping, useConnectionRefs } from '../../../core';
import { useConnector } from '../../../core/state/connection/connectionSelector';
import { getBrandColorFromConnector, getIconUriFromConnector } from '../../../core/utils/card';
import { ConnectorConnectionsCard } from './connectorConnectionsCard';
import { FocusTrapZone, IconButton, Text } from '@fluentui/react';
import { Accordion, AccordionItem } from '@fluentui/react-components';
import { type CommonPanelProps } from '@microsoft/designer-ui';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

export const ConnectionPanel = (props: CommonPanelProps) => {
  const intl = useIntl();

  const connectionMapping = useConnectionMapping();
  const connectionReferences = useConnectionRefs();

  const connectionsWithNodes = useMemo(() => {
    // make a copy of connectionReferences
    const connections: any = {};
    // const connections: any = JSON.parse(JSON.stringify(connectionReferences));
    for (const [nodeId, connectionReference] of Object.entries(connectionMapping)) {
      if (!connectionReference) continue;
      if (!connections[connectionReference]) {
        connections[connectionReference] = {
          nodes: [],
          ...connectionReferences?.[connectionReference],
        };
      }
      connections[connectionReference]?.nodes.push(nodeId);
    }
    return connections;
  }, [connectionMapping, connectionReferences]);

  const groupedConnections = useMemo(() => {
    const grouped: Record<string, Record<string, string[]>> = {};
    for (const connectionReference of Object.keys(connectionsWithNodes)) {
      const apiId = connectionReferences?.[connectionReference]?.api.id;
      if (!apiId) continue;
      grouped[apiId] = grouped?.[apiId] || {};
      grouped[apiId][connectionReference] = connectionsWithNodes[connectionReference];
    }
    return grouped;
  }, [connectionsWithNodes, connectionReferences]);

  /// INTL

  const connectionsPanelHeader = intl.formatMessage({
    defaultMessage: 'Connections',
    description: 'Header for the connections panel',
  });

  return (
    <FocusTrapZone>
      <div className="msla-app-action-header">
        <Text variant="xLarge">{connectionsPanelHeader}</Text>
        <IconButton onClick={props.toggleCollapse} iconProps={{ iconName: 'Cancel' }} />
      </div>
      <div className="msla-connections-panel-body">
        <Accordion collapsible multiple>
          {Object.entries(groupedConnections).map(([apiId, connectionRefs]) => (
            <AccordionItem key={apiId} value={apiId}>
              <ConnectorCardWrapper apiId={apiId} connectionRefs={connectionRefs} />
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </FocusTrapZone>
  );
};

interface ConnectorCardWrapperProps {
  apiId: string;
  connectionRefs: Record<string, string[]>;
}

const ConnectorCardWrapper = ({ apiId, connectionRefs }: ConnectorCardWrapperProps) => {
  const connectorQuery = useConnector(apiId);
  const connector = connectorQuery.data;

  return (
    <div>
      {connectorQuery.isLoading && <div>Loading...</div>}
      {connectorQuery.isError && <div>Error loading connector</div>}
      {connectorQuery.isSuccess && connector && (
        <ConnectorConnectionsCard
          connectorId={connector?.id}
          title={connector.properties.displayName}
          iconUri={getIconUriFromConnector(connector)}
          brandColor={getBrandColorFromConnector(connector)}
          connectionRefs={connectionRefs}
        />
      )}
    </div>
  );
};
