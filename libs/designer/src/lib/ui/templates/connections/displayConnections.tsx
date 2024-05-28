import { Button, Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow } from '@fluentui/react-components';
import type {
  // getDisplayNameFromConnector,
  // getIconUriFromConnector,
  // useConnector,
  Template,
} from '@microsoft/logic-apps-shared';
import { CreateTemplateConnectionWrapper } from '../../panel/templatePanel/createWorkflowPanel/createTemplateConnectionWrapper';
import { useState } from 'react';
import { CheckmarkCircle12Filled, SubtractCircle12Filled } from '@fluentui/react-icons';

export interface DisplayConnectionsProps {
  connections: Template.Connection[];
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
    { columnKey: 'connection', label: 'Connection' },
    { columnKey: 'connectionName', label: 'Connection Name' },
  ];

  const ConnectionListItem = ({ blankConnectorId }: { blankConnectorId: string }) => {
    if (!subscriptionId || !location) {
      return null;
    }
    const connectorId = blankConnectorId.replace('#subscription#', subscriptionId).replace('#location#', location);
    //const connectorQuery = useConnector(connectorId);
    //const connector = connectorQuery.data; // this is undefined/empty
    const iconUri = 'hi'; // getIconUriFromConnector(connector);
    const displayName = 'temp'; // getDisplayNameFromConnector(connector);
    const hasExistingConnection = false; // TODO: check if connection exists

    return (
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
            <Button
              onClick={() => {
                displayConnectionsPanel(connectorId);
              }}
            >
              Create
            </Button>
          </TableCellLayout>
        </TableCell>
      </TableRow>
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
            {connections.map((connection) => (
              <ConnectionListItem key={connection.id} blankConnectorId={connection.id} />
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
};
