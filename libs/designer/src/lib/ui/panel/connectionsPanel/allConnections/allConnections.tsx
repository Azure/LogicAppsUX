import { useConnectionMapping, useConnectionRefs, type RootState } from '../../../../core';
import { useConnector } from '../../../../core/state/connection/connectionSelector';
import { ConnectorConnectionsCard } from './connectorConnectionsCard';
import { Accordion, AccordionItem, type AccordionToggleEventHandler, Text } from '@fluentui/react-components';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';

export const AllConnections = () => {
  const intl = useIntl();
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

  const [openConnectors, setOpenConnectors] = useState<string[]>([]);
  const handleToggle: AccordionToggleEventHandler = (_e, data: any) => {
    setOpenConnectors((data?.openItems ?? []) as string[]);
  };

  const hasConnections = Object.keys(groupedConnections).length > 0;

  if (!hasConnections) {
    return (
      <div
        className="msla-connections-empty-state"
        role="region"
        aria-label={intl.formatMessage({
          defaultMessage: 'No connections found',
          id: 'MoCBWG',
          description: 'Aria label for empty connections state',
        })}
      >
        <div className="msla-connections-empty-state-icon" aria-hidden="true">
          <svg width="100" height="100" viewBox="0 0 18 18" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="acb29515-7071-4089-a76b-7b3da2049177" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E1DFDD" />
                <stop offset="100%" stopColor="#C8C6C4" />
              </linearGradient>
            </defs>
            <g>
              <path
                fill="url(#acb29515-7071-4089-a76b-7b3da2049177)"
                d="M18 10.55a4.11 4.11 0 0 0-3.51-4 5.14 5.14 0 0 0-5.25-5 5.26 5.26 0 0 0-5 3.47A4.87 4.87 0 0 0 0 9.82a4.94 4.94 0 0 0 5.07 4.8h8.65a1.46 1.46 0 0 0 .22 0A4.13 4.13 0 0 0 18 10.55z"
              />
              <circle cx="5.24" cy="9.65" r=".71" fill="#e3e3e3" />
              <path
                d="M7.74 9.92v-.57h-.08l-.61-.2-.16-.39.31-.66-.4-.4h-.08l-.57.3-.39-.16-.25-.69h-.57v.08l-.2.61-.42.16-.65-.31-.4.4v.08l.29.57-.16.39-.7.25V10h.08l.61.2.16.39-.31.66.4.4h.08l.57-.29.39.16.25.69h.57v-.08l.2-.61.39-.16.66.31.4-.4v-.08l-.29-.57.16-.39zm-2.5.83a1.1 1.1 0 1 1 1.1-1.1 1.09 1.09 0 0 1-1.1 1.1z"
                fill="#605E5C"
              />
              <circle cx="10" cy="6.59" r=".84" fill="#e3e3e3" />
              <path
                d="M13 6.91v-.68h-.09L12.17 6 12 5.49l.37-.8-.48-.48h-.09l-.69.35-.46-.19-.3-.83h-.71v.1l-.24.73-.47.19-.78-.37-.48.48.05.09.28.74-.16.5-.84.27V7h.1l.73.24.17.45-.37.8.5.51.1-.05.68-.35.47.19.3.83h.68v-.1l.24-.73.47-.19.79.37.48-.48-.05-.09-.29-.72.19-.47zm-3 1a1.32 1.32 0 1 1 1.32-1.32A1.31 1.31 0 0 1 10 7.91z"
                fill="#605E5C"
              />
            </g>
          </svg>
        </div>
        <Text className="msla-connections-empty-state-text" as="p">
          {intl.formatMessage({
            defaultMessage: 'No connections found in this workflow',
            id: 'u7p0Dp',
            description: 'Empty state message when no connections are found in the workflow',
          })}
        </Text>
      </div>
    );
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
