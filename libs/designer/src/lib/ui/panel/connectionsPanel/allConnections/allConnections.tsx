import { useConnectionMapping, useConnectionRefs, type RootState } from '../../../../core';
import { useConnector } from '../../../../core/state/connection/connectionSelector';
import { ConnectorConnectionsCard } from './connectorConnectionsCard';
import { Accordion, AccordionItem, type AccordionToggleEventHandler } from '@fluentui/react-components';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setConnectionPanelExpandedConnectorIds } from '../../../../core/state/panel/panelSlice';
import { AllConnectionsEmptyState } from './allConnectionsEmptyState';

export const AllConnections = () => {
  const dispatch = useDispatch();
  const connectionMapping = useConnectionMapping();
  const connectionReferences = useConnectionRefs();

  const allOperationInfo = useSelector((state: RootState) => state.operations.operationInfo);

  const connectionsWithNodes = useMemo(() => {
    // make a copy of connectionReferences
    const connections: any = {};
    // const connections: any = JSON.parse(JSON.stringify(connectionReferences));
    for (const [nodeId, connectionReference] of Object.entries(connectionMapping)) {
      if (!connectionReference) {
        continue; // Skip if no connection reference
      }
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

  const groupedDisconnectedNodes = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const [nodeId, connectionReference] of Object.entries(connectionMapping)) {
      if (!connectionReference) {
        const apiId = getRecordEntry(allOperationInfo, nodeId)?.connectorId;
        if (!apiId) {
          continue;
        }
        groups[apiId] = groups?.[apiId] || [];
        groups[apiId].push(nodeId);
      }
    }
    return groups;
  }, [allOperationInfo, connectionMapping]);

  const groupedConnections = useMemo(() => {
    const grouped: Record<string, Record<string, string[]>> = {};
    for (const connectionReference of Object.keys(connectionsWithNodes)) {
      const apiId = connectionReferences?.[connectionReference]?.api.id;
      if (!apiId) {
        continue;
      }
      grouped[apiId] = grouped?.[apiId] || {};
      grouped[apiId][connectionReference] = connectionsWithNodes[connectionReference];
    }
    for (const apiId of Object.keys(groupedDisconnectedNodes)) {
      grouped[apiId] = grouped?.[apiId] || {};
    }
    return grouped;
  }, [connectionsWithNodes, connectionReferences, groupedDisconnectedNodes]);

  const openConnectors = useSelector((state: RootState) => state.panel.connectionContent.expandedConnectorIds) || [];
  const handleToggle: AccordionToggleEventHandler = (_e, data: any) => {
    dispatch(setConnectionPanelExpandedConnectorIds((data?.openItems ?? []) as string[]));
  };

  const hasConnections = Object.keys(groupedConnections).length > 0;

  if (!hasConnections) {
    return <AllConnectionsEmptyState />;
  }

  return (
    <Accordion collapsible multiple openItems={openConnectors} onToggle={handleToggle}>
      {Object.entries(groupedConnections).map(([apiId, connectionRefs]) => (
        <AccordionItem key={apiId} value={apiId}>
          <ConnectorCardWrapper apiId={apiId} connectionRefs={connectionRefs} disconnectedNodes={groupedDisconnectedNodes?.[apiId]} />
        </AccordionItem>
      ))}
    </Accordion>
  );
};

interface ConnectorCardWrapperProps {
  apiId: string;
  connectionRefs: Record<string, string[]>;
  disconnectedNodes?: string[];
}

const ConnectorCardWrapper = ({ apiId, connectionRefs, disconnectedNodes }: ConnectorCardWrapperProps) => {
  const { data: connector, isFetching } = useConnector(apiId);

  return (
    <div>
      <ConnectorConnectionsCard
        isLoading={isFetching}
        connectorId={apiId}
        connector={connector}
        connectionRefs={connectionRefs}
        disconnectedNodes={disconnectedNodes}
      />
    </div>
  );
};
