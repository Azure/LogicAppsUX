import { useConnectionMapping, useConnectionRefs } from '../../../../core';
import { useConnector } from '../../../../core/state/connection/connectionSelector';
import { getIconUriFromConnector, getBrandColorFromConnector } from '../../../../core/utils/card';
import { ConnectorConnectionsCard } from './connectorConnectionsCard';
import { Accordion, AccordionItem } from '@fluentui/react-components';
import { useMemo } from 'react';

export const AllConnections = () => {
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

  return (
    <Accordion collapsible multiple>
      {Object.entries(groupedConnections).map(([apiId, connectionRefs]) => (
        <AccordionItem key={apiId} value={apiId}>
          <ConnectorCardWrapper apiId={apiId} connectionRefs={connectionRefs} />
        </AccordionItem>
      ))}
    </Accordion>
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
