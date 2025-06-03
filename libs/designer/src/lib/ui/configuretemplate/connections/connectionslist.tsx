import type { RootState } from '../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { Table, TableBody, TableCell, TableCellLayout, TableHeader, TableHeaderCell, TableRow, Text } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { ConnectorIconWithName } from '../../templates/connections/connector';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { useResourceStrings } from '../resources';
import { DescriptionWithLink, ErrorBar } from '../common';
import { mergeStyles } from '@fluentui/react';
import { normalizeConnectorId } from '@microsoft/logic-apps-shared';

export const TemplateConnectionsList = () => {
  const intl = useIntl();
  const resources = {
    Description: intl.formatMessage({
      defaultMessage:
        'These are the connection services this template depends on. When users deploy a workflow using this template, they’ll be prompted to create connections to the services it uses.',
      id: 'SUaXux',
      description: 'The description for the connections tab',
    }),
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
    ErrorTitle: intl.formatMessage({
      defaultMessage: 'Validation failed for connections: ',
      id: 'mGNP59',
      description: 'The error title for the connections tab',
    }),
  };
  const { connectorKinds } = useTemplatesStrings();
  const resourceStrings = useResourceStrings();

  const { connections, error, subscriptionId, location } = useSelector((state: RootState) => ({
    connections: state.template.connections,
    error: state.template.errors.connections,
    subscriptionId: state.workflow.subscriptionId,
    location: state.workflow.location,
  }));
  const items = useMemo(
    () =>
      Object.keys(connections).map((connectionKey) => ({
        id: normalizeConnectorId(connections[connectionKey].connectorId, subscriptionId, location),
        kind: connections[connectionKey].kind,
        connectionKey,
      })),
    [connections, location, subscriptionId]
  );

  const columns = [
    { columnKey: 'connector', label: resources.ConnectorLabel },
    { columnKey: 'kind', label: resources.KindLabel },
  ];

  if (Object.keys(connections).length === 0) {
    return (
      <div className="msla-templates-wizard-tab-content" style={{ overflowX: 'auto', paddingTop: '12px' }}>
        <Text>{resourceStrings.NoConnectionInTemplate}</Text>
      </div>
    );
  }

  return (
    <div className="msla-templates-wizard-tab-content" style={{ overflowX: 'auto', paddingTop: '12px' }}>
      <DescriptionWithLink
        text={resources.Description}
        linkText={resourceStrings.LearnMore}
        linkUrl="https://go.microsoft.com/fwlink/?linkid=2321713"
        className={mergeStyles({ marginLeft: '-10px', width: '70%' })}
      />
      {error ? <ErrorBar title={resources.ErrorTitle} errorMessage={error} styles={{ marginLeft: '-10px' }} /> : null}
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
              <TableCell>{connectorKinds[(item.kind ?? '').toLowerCase()]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
