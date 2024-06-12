import { Button, Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow } from '@fluentui/react-components';
import { getDisplayNameFromConnector, getIconUriFromConnector, type Template, isArmResourceId } from '@microsoft/logic-apps-shared';
import { CreateTemplateConnectionWrapper } from '../../panel/templatePanel/createWorkflowPanel/createTemplateConnectionWrapper';
import { useState } from 'react';
import { CheckmarkCircle12Filled, SubtractCircle12Filled } from '@fluentui/react-icons';
import { useConnector } from '../../../core/state/connection/connectionSelector';
import { useConnectionsForConnector } from '../../../core/queries/connections';

export interface DisplayConnectionsProps {
  connections: Record<string, Template.Connection>;
  subscriptionId: string | undefined;
  location: string | undefined;
}

export const DisplayConnections = ({ connections, subscriptionId, location }: DisplayConnectionsProps) => {
  const [showConnectionPanel, setShowConnectionPanel] = useState(false);
  const [clickedConnectorId, setClickedConnectorId] = useState<string | undefined>(undefined);

  const displayConnectionsPanel = async (clickedConnectorId: string) => {
    setClickedConnectorId(clickedConnectorId);
    setShowConnectionPanel(true);
  };

  const columns = [
    { columnKey: 'name', label: 'Name' },
    { columnKey: 'status', label: 'Status' },
    { columnKey: 'connection', label: 'Connection' },
  ];

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

    return (
      connectorId && (
        <TableRow key={displayName}>
          <TableCell tabIndex={0} role="gridcell">
            <TableCellLayout media={<img className="msla-action-icon" src={iconUri} />}>{displayName}</TableCellLayout>
          </TableCell>
          <TableCell tabIndex={0} role="gridcell">
            <TableCellLayout media={hasExistingConnection ? <CheckmarkCircle12Filled /> : <SubtractCircle12Filled />}>
              {hasExistingConnection ? 'Connected' : 'Not Connected'}
            </TableCellLayout>
          </TableCell>
          <TableCell role="gridcell">
            <TableCellLayout>
              {hasExistingConnection && connection ? (
                <p>{connection[0].properties.displayName}</p>
              ) : (
                <Button
                  onClick={() => {
                    displayConnectionsPanel(connectorId);
                  }}
                >
                  Create
                </Button>
              )}
            </TableCellLayout>
          </TableCell>
        </TableRow>
      )
    );
  };
  return (
    <>
      {showConnectionPanel && clickedConnectorId ? (
        <CreateTemplateConnectionWrapper connectorId={clickedConnectorId} />
      ) : (
        <Table role="grid">
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHeaderCell key={column.columnKey}>{column.label}</TableHeaderCell>
              ))}
              <TableHeaderCell />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.keys(connections).map((connectionKey, index) => (
              <ConnectionListItem key={index} blankConnectorId={connections[connectionKey]?.id} />
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
};
