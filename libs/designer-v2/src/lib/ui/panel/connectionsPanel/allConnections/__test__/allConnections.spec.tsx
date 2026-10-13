// @vitest-environment jsdom
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectionMapping, ConnectionReferences } from '../../../../../common/models/workflow';
import { AllConnections } from '../allConnections';

interface SelectorState {
  operations: { operationInfo: Record<string, { connectorId: string; operationId: string }> };
  panel: { connectionContent: { expandedConnectorIds: string[] } };
}

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  useConnectionById: vi.fn(),
  useConnector: vi.fn(),
  openConnectionResource: vi.fn(),
  mapping: {} as ConnectionMapping,
  references: {} as ConnectionReferences,
  errors: {} as Record<string, string[]>,
  displayNames: {} as Record<string, string>,
  state: {
    operations: { operationInfo: {} },
    panel: { connectionContent: { expandedConnectorIds: [] } },
  } as SelectorState,
  readOnly: false,
  monitoring: false,
}));

const openPanel = (payload: unknown) => ({ type: 'panel/openPanel', payload });

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector: (state: SelectorState) => unknown) => selector(mocks.state),
}));

vi.mock('../../../../../core', () => ({
  useConnectionMapping: () => mocks.mapping,
  useConnectionRefs: () => mocks.references,
  useAllConnectionErrors: () => mocks.errors,
  useNodeDisplayName: (nodeId: string) => mocks.displayNames[nodeId] ?? nodeId,
  openPanel: (payload: unknown) => openPanel(payload),
}));

vi.mock('../../../../../core/state/connection/connectionSelector', () => ({
  useConnector: (connectorId: string) => mocks.useConnector(connectorId),
}));

vi.mock('../../../../../core/queries/connections', () => ({
  useConnectionById: (connectionId: string, connectorId: string) => mocks.useConnectionById(connectionId, connectorId),
}));

vi.mock('../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: () => mocks.readOnly,
  useMonitoringView: () => mocks.monitoring,
}));

vi.mock('../../../../../core/state/panel/panelSlice', () => ({
  openPanel: (payload: unknown) => openPanel(payload),
  setConnectionPanelExpandedConnectorIds: (payload: string[]) => ({
    type: 'panel/setConnectionPanelExpandedConnectorIds',
    payload,
  }),
}));

vi.mock('@microsoft/designer-ui', () => ({
  useConnectionContainerStyles: () => ({
    connectionStatusIcon: 'connectionStatusIcon',
    iconError: 'iconError',
    iconSuccess: 'iconSuccess',
  }),
  isBuiltInConnector: () => true,
  getConnectorCategoryString: () => 'Built-in',
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@microsoft/logic-apps-shared')>()),
  HostService: () => ({ openConnectionResource: mocks.openConnectionResource }),
}));

const sqlConnectorId = '/serviceProviders/sql';
const blobConnectorId = '/serviceProviders/azureblob';
const sqlResourceId = '/sql-resource';
const upperResourceId = '/upper-resource';
const runtimeTitle = 'Connection selected at runtime';
const reassignLabel = 'Reassign all connected actions to a new connection';

const makeConnector = (id: string, displayName: string) =>
  ({
    id,
    name: id.split('/').pop(),
    properties: { displayName, iconUri: 'data:image/svg+xml,<svg/>', brandColor: '#0078d4' },
  }) as Connector;

const makeConnection = (id: string, displayName: string) =>
  ({
    id,
    name: id,
    properties: { displayName, statuses: [{ status: 'Connected' }] },
  }) as Connection;

const setOperation = (nodeId: string, connectorId = sqlConnectorId) => {
  mocks.state.operations.operationInfo[nodeId] = { connectorId, operationId: 'test-operation' };
};

const setMixedConnections = () => {
  mocks.mapping = {
    static_action: 'sql',
    second_static_action: 'sql',
    runtime_action: { kind: 'expression', expression: "@parameters('sqlConnection')", designTimeReferenceKey: 'sql' },
    other_runtime_action: { kind: 'expression', expression: "@appsetting('OTHER_CONNECTION')" },
    disconnected_action: null,
  };
  for (const nodeId of Object.keys(mocks.mapping)) {
    setOperation(nodeId);
  }
  mocks.displayNames = {
    static_action: 'Static query',
    second_static_action: 'Another static query',
    runtime_action: 'Renamed runtime query',
    other_runtime_action: 'Another runtime query',
    disconnected_action: 'Disconnected query',
  };
};

const renderAllConnections = () =>
  render(
    <FluentProvider theme={webLightTheme}>
      <IntlProvider locale="en">
        <AllConnections />
      </IntlProvider>
    </FluentProvider>
  );

// Connection blocks have no landmark role, so scope semantic queries to their existing containers.
const connectionBlock = (title: string, scope: HTMLElement = document.body) => {
  const block = within(scope).getByText(title).closest<HTMLElement>('.msla-connector-connections-card-connection');
  expect(block).not.toBeNull();
  return block!;
};

const connectorCard = (title: string) => {
  const card = screen.getByRole('button', { name: new RegExp(title) }).closest<HTMLElement>('.fui-AccordionItem');
  expect(card).not.toBeNull();
  return card!;
};

const validationBadges = (card: HTMLElement) =>
  [...card.querySelectorAll('.fui-AccordionHeader .fui-Badge')].filter((badge) => !badge.textContent);

describe('AllConnections runtime connector groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mapping = {};
    mocks.references = {
      sql: { api: { id: sqlConnectorId }, connection: { id: sqlResourceId } },
    };
    mocks.errors = {};
    mocks.displayNames = {};
    mocks.readOnly = false;
    mocks.monitoring = false;
    mocks.state = {
      operations: { operationInfo: {} },
      panel: { connectionContent: { expandedConnectorIds: [sqlConnectorId, blobConnectorId] } },
    };
    mocks.useConnector.mockImplementation((id: string) => ({
      data: makeConnector(id, id === blobConnectorId.toLowerCase() ? 'Azure Blob Storage' : 'SQL Server'),
      isFetching: false,
    }));
    const connections: Record<string, Connection> = {
      [sqlResourceId]: makeConnection(sqlResourceId, 'Static SQL connection'),
      [upperResourceId]: makeConnection(upperResourceId, 'Uppercase SQL connection'),
    };
    mocks.useConnectionById.mockImplementation((id: string) => ({
      result: connections[id],
      isLoading: false,
    }));
  });

  afterEach(cleanup);

  it('groups static, differing runtime expressions, and disconnected actions into three blocks in one connector accordion', () => {
    setMixedConnections();
    const { container } = renderAllConnections();

    const card = connectorCard('SQL Server');
    expect(container.querySelectorAll('.fui-AccordionItem')).toHaveLength(1);
    expect(card.querySelector('.fui-AccordionItem')).toBeNull();
    expect(card.querySelectorAll('.msla-connector-connections-card-connection')).toHaveLength(3);
    expect(screen.queryByText('Connections selected at runtime')).not.toBeInTheDocument();
    expect(within(card).getAllByText(runtimeTitle)).toHaveLength(1);

    const runtime = connectionBlock(runtimeTitle, card);
    expect(within(runtime).getByRole('button', { name: 'Renamed runtime query' })).toBeInTheDocument();
    expect(within(runtime).getByRole('button', { name: 'Another runtime query' })).toBeInTheDocument();
    expect(within(runtime).queryByRole('button', { name: 'Static query' })).not.toBeInTheDocument();
    expect(within(runtime).queryByRole('button', { name: 'Disconnected query' })).not.toBeInTheDocument();
    expect(runtime.querySelector('[data-icon-name="LinkMultiple24Regular"]')).not.toBeNull();
    expect(runtime.querySelector('[data-icon-name="CheckmarkCircle24Filled"]')).toBeNull();
    expect(runtime.querySelector('[data-icon-name="PlugDisconnected24Filled"]')).toBeNull();
    expect(within(runtime).queryByRole('button', { name: 'Open connection' })).not.toBeInTheDocument();
    expect(screen.queryByText("@parameters('sqlConnection')")).not.toBeInTheDocument();
    expect(screen.queryByText("@appsetting('OTHER_CONNECTION')")).not.toBeInTheDocument();

    const staticBlock = connectionBlock('Static SQL connection', card);
    expect(within(staticBlock).getByRole('button', { name: 'Static query' })).toBeInTheDocument();
    expect(within(staticBlock).getByRole('button', { name: 'Another static query' })).toBeInTheDocument();
    expect(staticBlock.querySelector('[data-icon-name="CheckmarkCircle24Filled"]')).not.toBeNull();
    fireEvent.click(within(staticBlock).getByRole('button', { name: 'Open connection' }));
    expect(mocks.openConnectionResource).toHaveBeenCalledExactlyOnceWith(sqlResourceId);

    const disconnected = connectionBlock('Disconnected', card);
    expect(within(disconnected).getByRole('button', { name: 'Disconnected query' })).toBeInTheDocument();
    expect(disconnected).toHaveClass('disconnected');
    expect(disconnected.querySelector('[data-icon-name="PlugDisconnected24Filled"]')).not.toBeNull();
    expect(validationBadges(card)).toHaveLength(1);
  });

  it('retains runtime-only connectors and never looks up an expression or its design-time reference as a resource', () => {
    mocks.mapping = {
      runtime_action: {
        kind: 'expression',
        expression: "@parameters('runtimeConnection')",
        designTimeReferenceKey: 'sql',
      },
    };
    setOperation('runtime_action');
    renderAllConnections();

    expect(within(connectorCard('SQL Server')).getByText(runtimeTitle)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'No connections found' })).not.toBeInTheDocument();
    expect(screen.queryByText('Static SQL connection')).not.toBeInTheDocument();
    expect(mocks.useConnectionById).toHaveBeenCalled();
    expect(mocks.useConnectionById.mock.calls.every((args) => args[0] === '' && args[1] === '')).toBe(true);
    expect(mocks.useConnector).toHaveBeenCalledWith(sqlConnectorId.toLowerCase());
    expect(validationBadges(connectorCard('SQL Server'))).toHaveLength(0);
  });

  it('keeps two runtime-only providers separate even when there are no concrete references', () => {
    mocks.references = {};
    mocks.mapping = {
      sql_action: { kind: 'expression', expression: "@parameters('sharedConnection')" },
      blob_action: { kind: 'expression', expression: "@parameters('sharedConnection')" },
    };
    setOperation('sql_action');
    setOperation('blob_action', blobConnectorId);
    const { container } = renderAllConnections();

    expect(container.querySelectorAll('.fui-AccordionItem')).toHaveLength(2);
    const sql = connectorCard('SQL Server');
    const blob = connectorCard('Azure Blob Storage');
    expect(within(sql).getAllByText(runtimeTitle)).toHaveLength(1);
    expect(within(blob).getAllByText(runtimeTitle)).toHaveLength(1);
    expect(within(sql).getByRole('button', { name: 'sql_action' })).toBeInTheDocument();
    expect(within(sql).queryByRole('button', { name: 'blob_action' })).not.toBeInTheDocument();
    expect(within(blob).getByRole('button', { name: 'blob_action' })).toBeInTheDocument();
    expect(within(blob).queryByRole('button', { name: 'sql_action' })).not.toBeInTheDocument();

    fireEvent.click(within(blob).getByRole('button', { name: reassignLabel }));
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith(
      openPanel({ nodeIds: ['blob_action'], panelMode: 'Connection', referencePanelMode: 'Connection' })
    );
  });

  it('merges connector casing without merging case-sensitive Sql and sql reference keys', () => {
    mocks.references.Sql = { api: { id: sqlConnectorId.toUpperCase() }, connection: { id: upperResourceId } };
    mocks.mapping = {
      upper_static: 'Sql',
      lower_static: 'sql',
      upper_runtime: { kind: 'expression', expression: "@parameters('upper')" },
      lower_runtime: { kind: 'expression', expression: "@parameters('lower')" },
    };
    setOperation('upper_runtime', sqlConnectorId.toUpperCase());
    setOperation('lower_runtime', sqlConnectorId.toLowerCase());
    mocks.state.panel.connectionContent.expandedConnectorIds = [sqlConnectorId.toUpperCase()];
    const { container } = renderAllConnections();

    expect(container.querySelectorAll('.fui-AccordionItem')).toHaveLength(1);
    const card = connectorCard('SQL Server');
    expect(card.querySelectorAll('.msla-connector-connections-card-connection')).toHaveLength(3);
    expect(within(connectionBlock('Uppercase SQL connection')).getByRole('button', { name: 'upper_static' })).toBeInTheDocument();
    expect(within(connectionBlock('Uppercase SQL connection')).queryByRole('button', { name: 'lower_static' })).not.toBeInTheDocument();
    expect(within(connectionBlock('Static SQL connection')).getByRole('button', { name: 'lower_static' })).toBeInTheDocument();
    expect(within(connectionBlock('Static SQL connection')).queryByRole('button', { name: 'upper_static' })).not.toBeInTheDocument();
    const runtime = connectionBlock(runtimeTitle);
    expect(within(runtime).getByRole('button', { name: 'upper_runtime' })).toBeInTheDocument();
    expect(within(runtime).getByRole('button', { name: 'lower_runtime' })).toBeInTheDocument();
    expect(mocks.useConnectionById).toHaveBeenCalledWith(upperResourceId, sqlConnectorId.toLowerCase());
    expect(mocks.useConnectionById).toHaveBeenCalledWith(sqlResourceId, sqlConnectorId.toLowerCase());

    fireEvent.click(screen.getByRole('button', { name: /SQL Server/ }));
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'panel/setConnectionPanelExpandedConnectorIds', payload: [] });
  });

  it('uses original action IDs for individual links and limits each bulk Reassign to its own block', () => {
    setMixedConnections();
    renderAllConnections();

    fireEvent.click(screen.getByRole('button', { name: 'Renamed runtime query' }));
    expect(mocks.dispatch).toHaveBeenLastCalledWith(
      openPanel({ nodeId: 'runtime_action', panelMode: 'Connection', referencePanelMode: 'Connection' })
    );

    fireEvent.click(within(connectionBlock(runtimeTitle)).getByRole('button', { name: reassignLabel }));
    expect(mocks.dispatch).toHaveBeenLastCalledWith(
      openPanel({ nodeIds: ['runtime_action', 'other_runtime_action'], panelMode: 'Connection', referencePanelMode: 'Connection' })
    );

    fireEvent.click(within(connectionBlock('Static SQL connection')).getByRole('button', { name: reassignLabel }));
    expect(mocks.dispatch).toHaveBeenLastCalledWith(
      openPanel({ nodeIds: ['static_action', 'second_static_action'], panelMode: 'Connection', referencePanelMode: 'Connection' })
    );

    fireEvent.click(within(connectionBlock('Disconnected')).getByRole('button', { name: reassignLabel }));
    expect(mocks.dispatch).toHaveBeenLastCalledWith(
      openPanel({ nodeIds: ['disconnected_action'], panelMode: 'Connection', referencePanelMode: 'Connection' })
    );
    expect(mocks.dispatch).toHaveBeenCalledTimes(4);
  });

  it.each(['readOnly', 'monitoring'] as const)('disables every block Reassign in %s mode', (mode) => {
    setMixedConnections();
    mocks[mode] = true;
    renderAllConnections();

    const buttons = screen.getAllByRole('button', { name: reassignLabel });
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it('aggregates actual runtime node errors only into their owning connector badge', () => {
    mocks.references = {};
    mocks.mapping = {
      sql_runtime: { kind: 'expression', expression: "@parameters('sql')" },
      blob_runtime: { kind: 'expression', expression: "@parameters('blob')" },
    };
    setOperation('sql_runtime');
    setOperation('blob_runtime', blobConnectorId);
    mocks.errors = { unrelated_action: ['Unrelated validation error'] };
    const { rerender } = renderAllConnections();
    expect(validationBadges(connectorCard('SQL Server'))).toHaveLength(0);
    expect(validationBadges(connectorCard('Azure Blob Storage'))).toHaveLength(0);

    mocks.errors = { sql_runtime: ['Invalid connection expression'], unrelated_action: ['Unrelated validation error'] };
    rerender(
      <FluentProvider theme={webLightTheme}>
        <IntlProvider locale="en">
          <AllConnections />
        </IntlProvider>
      </FluentProvider>
    );
    expect(validationBadges(connectorCard('SQL Server'))).toHaveLength(1);
    expect(validationBadges(connectorCard('Azure Blob Storage'))).toHaveLength(0);
    expect(within(connectorCard('SQL Server')).getByText(runtimeTitle)).toBeInTheDocument();
    expect(connectionBlock(runtimeTitle, connectorCard('SQL Server')).querySelector('[data-icon-name="ErrorCircle24Filled"]')).toBeNull();
  });

  it('preserves the empty state when the workflow has no connection bindings', () => {
    const { container } = renderAllConnections();

    expect(screen.getByRole('region', { name: 'No connections found' })).toBeInTheDocument();
    expect(screen.getByText('No connections found in this workflow')).toBeInTheDocument();
    expect(screen.queryByText(runtimeTitle)).not.toBeInTheDocument();
    expect(container.querySelector('.fui-AccordionItem')).toBeNull();
    expect(mocks.useConnector).not.toHaveBeenCalled();
    expect(mocks.useConnectionById).not.toHaveBeenCalled();
  });
});
