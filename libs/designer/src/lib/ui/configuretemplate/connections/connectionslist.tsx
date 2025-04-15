import type { RootState } from '../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow, Text } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { ConnectorIconWithName } from '../../templates/connections/connector';
import { useTemplatesStrings } from '../../templates/templatesStrings';

export const TemplateConnectionsList = () => {
  const intl = useIntl();
  const resources = {
    AriaLabel: intl.formatMessage({
      defaultMessage: 'List of connectors needing connections',
      id: 'hQp3t6',
      description: 'The aria label for the connections table',
    }),
    ConnectorLabel: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'T1q9LE',
      description: 'The label for the connector column',
    }),
    KindLabel: intl.formatMessage({
      defaultMessage: 'Type',
      id: 'OF3adl',
      description: 'The label for the kind column',
    }),
  };
  const { connectorKinds } = useTemplatesStrings();
  const { connections } = useSelector((state: RootState) => ({
    connections: state.template.connections,
  }));
  const items = useMemo(
    () =>
      Object.keys(connections).map((connectionKey) => ({
        id: connections[connectionKey].connectorId,
        kind: connections[connectionKey].kind,
        connectionKey,
      })),
    [connections]
  );

  const columns = [
    { columnKey: 'connector', label: resources.ConnectorLabel },
    { columnKey: 'kind', label: resources.KindLabel },
  ];

  return (
    <div style={{ overflowX: 'auto', paddingTop: '12px' }}>
      <Table aria-label={resources.AriaLabel} size="small" style={{ width: '80%' }}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHeaderCell key={column.columnKey}>
                <Text weight="semibold">{column.label}</Text>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.connectionKey}>
              <TableCell>
                <TableCellLayout
                  media={
                    <ConnectorIconWithName
                      connectorId={item.id}
                      showProgress={true}
                      classes={{
                        root: 'msla-template-create-connector',
                        icon: 'msla-template-create-connector-icon',
                        text: 'msla-template-create-connector-text',
                      }}
                    />
                  }
                />
              </TableCell>
              <TableCell>{connectorKinds[item.kind as string]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
