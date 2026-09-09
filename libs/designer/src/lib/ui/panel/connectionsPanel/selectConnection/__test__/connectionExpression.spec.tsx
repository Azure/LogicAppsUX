import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  connectionExpressionEditor,
} from '../../../../../../../../designer-ui/src/lib/editor/__test__/connection-expression-editor-helper';
import { SelectConnectionWrapper } from '../selectConnection';
import { AllConnections } from '../../allConnections/allConnections';
import { ConnectionDisplay } from '../../../nodeDetailsPanel/tabs/parametersTab/connectionDisplay';
import { createValueSegmentFromToken } from '../../../../../core/utils/tokens';

const mocks = vi.hoisted(() => ({
  state: {} as any,
  dispatch: vi.fn(() => ({ unwrap: () => Promise.resolve() })),
  autoCreate: vi.fn(),
  setupConnection: vi.fn(),
  expressionUpdate: vi.fn((payload) => ({ type: 'expression', payload })),
  staticUpdate: vi.fn((payload) => ({ type: 'static', payload })),
  query: { data: [] as any[], isLoading: false, isError: false },
  selectedNodeIds: ['action'],
  connectorQuery: vi.fn(() => ({ data: undefined, isFetching: false })),
  pickerProps: undefined as any,
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector: (state: any) => unknown) => selector(mocks.state),
}));
vi.mock('../../../../../core', () => ({
  useOperationInfo: () => mocks.state.operations.operationInfo.action,
  useConnectionMapping: () => mocks.state.connections.connectionsMapping,
  useConnectionRefs: () => mocks.state.connections.connectionReferences,
  openPanel: (payload: unknown) => ({ type: 'openPanel', payload }),
}));
vi.mock('../../../../../core/actions/bjsworkflow/connections', () => ({
  autoCreateConnectionIfPossible: mocks.autoCreate,
  updateNodeConnectionExpression: mocks.expressionUpdate,
  updateNodeConnection: mocks.staticUpdate,
}));
vi.mock('../../../../../core/state/connection/connectionSelector', () => ({
  useConnector: mocks.connectorQuery,
  useNodeConnectionMapping: () => mocks.state.connections.connectionsMapping.action,
  useNodeConnectionId: () => '/connections/SqlDesign',
  useConnectionRefs: () => mocks.state.connections.connectionReferences,
  useConnectionRefsByConnectorId: () => [],
  useConnectorByNodeId: () => ({ id: '/serviceProviders/sql', name: 'sql' }),
  useIsOperationMissingConnection: () => true,
}));
vi.mock('../../../../../core/state/selectors/actionMetadataSelector', () => ({
  useOperationInfo: () => mocks.state.operations.operationInfo.action,
  useIsConnectionRequired: () => true,
}));
vi.mock('../../../../../core/state/panel/panelSelectors', () => ({
  useConnectionPanelSelectedNodeIds: () => mocks.selectedNodeIds,
  useOperationPanelSelectedNodeId: () => 'action',
  usePreviousPanelMode: () => 'Operation',
}));
vi.mock('../../../../../core/state/panel/panelSlice', () => ({
  openPanel: (payload: unknown) => ({ type: 'openPanel', payload }),
  setIsCreatingConnection: (payload: unknown) => ({ type: 'createPanel', payload }),
  setConnectionPanelExpandedConnectorIds: (payload: unknown) => ({ type: 'expandConnectors', payload }),
}));
vi.mock('../../../../../core/state/designerView/designerViewSelectors', () => ({ useIsA2AWorkflow: () => false }));
vi.mock('../../../../../common/hooks/agent', () => ({ useIsAgentSubGraph: () => false }));
vi.mock('../../../../../core/queries/connections', () => ({ useConnectionsForConnector: () => mocks.query }));
vi.mock('../../actionList/actionList', () => ({ ActionList: () => null }));
vi.mock('../../allConnections/connectorConnectionsCard', () => ({
  ConnectorConnectionsCard: () => <div>Concrete connections</div>,
}));
vi.mock('../connectionTable', () => ({
  ConnectionTable: ({ saveSelectionCallback }: any) => (
    <button type="button" onClick={() => saveSelectionCallback({ id: '/connections/SqlDesign' })}>
      Select SqlDesign
    </button>
  ),
}));
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@microsoft/logic-apps-shared')>()),
  ConnectionService: () => ({ setupConnectionIfNeeded: mocks.setupConnection }),
  LoggerService: () => ({ log: vi.fn() }),
}));
vi.mock('../../../../../core/utils/tokens', () => ({
  getExpressionTokenSections: () => [],
  getOutputTokenSections: vi.fn(() => [
    { id: 'parameters', label: 'Parameters', tokens: [{ title: 'ConnectionName', value: "parameters('ConnectionName')", outputInfo: {} }] },
    {
      id: 'previous',
      label: 'Previous action',
      tokens: [
        { title: 'Output', value: "outputs('Previous')", outputInfo: {} },
        { title: 'Array item connection', value: "item()?['connectionName']", outputInfo: { arrayDetails: { parentArrayName: 'rows' } } },
      ],
    },
  ]),
  createValueSegmentFromToken: vi.fn(async (_nodeId, _parameterId, token) => ({
    id: token.title,
    type: 'token',
    value: token.value,
    token: { key: token.title, title: token.title, tokenType: 'fx', value: token.value },
  })),
}));

vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/designer-ui')>();
  const { INSERT_TOKEN_NODE } = await import('../../../../../../../../designer-ui/src/lib/editor/base/plugins/InsertTokenNode');
  return {
    ...actual,
    TokenPicker: (props: any) => {
      mocks.pickerProps = props;
      return (
        <div>
          {props.tokenGroup.flatMap((group: any) =>
            group.tokens.map((token: any) => (
              <button
                key={token.title}
                type="button"
                onClick={async () => {
                  const segment = await props.getValueSegmentFromToken(token, true);
                  connectionExpressionEditor.current?.update(() => {
                    $getRoot().selectEnd();
                    connectionExpressionEditor.current?.dispatchCommand(INSERT_TOKEN_NODE, { title: token.title, data: segment });
                  });
                }}
              >
                {token.title}
              </button>
            ))
          )}
        </div>
      );
    },
  };
});

const expression = "@if(equals(triggerBody()?['Route'], 'A'), outputs('Previous'), parameters('ConnectionName'))";
const renderPanel = () =>
  render(
    <IntlProvider locale="en">
      <SelectConnectionWrapper />
    </IntlProvider>
  );
const edit = async (value: string) => {
  await act(async () => {
    connectionExpressionEditor.current?.update(
      () => {
        const paragraph = $createParagraphNode();
        if (value) {
          paragraph.append($createTextNode(value));
        }
        $getRoot().clear().append(paragraph);
        paragraph.selectEnd();
      },
      { discrete: true }
    );
  });
};
const expressionMode = async () => {
  fireEvent.click(screen.getByRole('radio', { name: 'Use expression' }));
  await waitFor(() => expect(connectionExpressionEditor.current).toBeDefined());
};

beforeEach(() => {
  vi.clearAllMocks();
  connectionExpressionEditor.current = undefined;
  mocks.selectedNodeIds = ['action'];
  mocks.pickerProps = undefined;
  mocks.query = { data: [], isLoading: false, isError: false };
  mocks.state = {
    designerOptions: { readOnly: false, hostOptions: { enableServiceProviderConnectionExpressions: true } },
    workflow: { workflowKind: 'stateful', nodesMetadata: { action: { isTrigger: false } }, idReplacements: {} },
    operations: { operationInfo: { action: { type: 'ServiceProvider', connectorId: '/serviceProviders/sql' } } },
    connections: {
      connectionsMapping: { action: null },
      connectionReferences: {
        SqlDesign: { api: { id: '/serviceProviders/sql' }, connection: { id: '/connections/SqlDesign' }, connectionName: 'Friendly label' },
        sqldesign: { api: { id: '/serviceProviders/sql' }, connection: { id: '/connections/sqldesign' } },
        unrelated: { api: { id: '/serviceProviders/blob' }, connection: { id: '/connections/blob' } },
      },
    },
    tokens: {},
    workflowParameters: {},
    panel: { connectionContent: { expandedConnectorIds: [] } },
  };
});
afterEach(cleanup);

describe('connection expression selection', () => {
  it.each<[string, () => void]>([
    [
      'disabled flag',
      () => {
        mocks.state.designerOptions.hostOptions.enableServiceProviderConnectionExpressions = false;
      },
    ],
    [
      'Consumption',
      () => {
        mocks.state.workflow.workflowKind = undefined;
      },
    ],
    [
      'trigger',
      () => {
        mocks.state.workflow.nodesMetadata.action.isTrigger = true;
      },
    ],
    [
      'API connection',
      () => {
        mocks.state.operations.operationInfo.action.type = 'ApiConnection';
      },
    ],
    [
      'no selected actions',
      () => {
        mocks.selectedNodeIds = [];
      },
    ],
    [
      'multiple eligible actions',
      () => {
        mocks.selectedNodeIds = ['action', 'second'];
        mocks.state.workflow.nodesMetadata.second = { isTrigger: false };
        mocks.state.operations.operationInfo.second = { type: 'ServiceProvider', connectorId: '/serviceProviders/sql' };
      },
    ],
  ])('does not offer expression authoring for %s', (_name, configure) => {
    configure();
    renderPanel();
    expect(screen.queryByRole('radio', { name: 'Use expression' })).not.toBeInTheDocument();
  });

  it('does not auto-create when expression authoring is available and no connections exist', () => {
    renderPanel();
    expect(screen.getByRole('radio', { name: 'Existing connection' })).toBeChecked();
    expect(mocks.autoCreate).not.toHaveBeenCalled();
  });

  it('does not apply an imported expression to multiple selected actions', () => {
    mocks.selectedNodeIds = ['action', 'second'];
    mocks.state.workflow.nodesMetadata.second = { isTrigger: false };
    mocks.state.operations.operationInfo.second = { type: 'ServiceProvider', connectorId: '/serviceProviders/sql' };
    mocks.state.connections.connectionsMapping = {
      action: { kind: 'expression', expression },
      second: 'SqlDesign',
    };
    const originalMappings = structuredClone(mocks.state.connections.connectionsMapping);
    renderPanel();

    expect(screen.getByRole('textbox', { name: 'Connection expression' })).toHaveAttribute('contenteditable', 'false');
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply).toBeDisabled();
    fireEvent.click(apply);
    expect(mocks.expressionUpdate).not.toHaveBeenCalled();
    expect(mocks.state.connections.connectionsMapping).toEqual(originalMappings);
  });

  it('keeps expression mode accessible while connection resources are loading', async () => {
    mocks.query.isLoading = true;
    renderPanel();
    await expressionMode();
    await edit(expression);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(mocks.expressionUpdate).toHaveBeenCalledWith({ nodeId: 'action', expression, designTimeReferenceKey: undefined })
    );
    expect(mocks.setupConnection).not.toHaveBeenCalled();
    expect(mocks.autoCreate).not.toHaveBeenCalled();
  });

  it.each([
    "@outputs('Previous')",
    "@parameters('ConnectionName')",
    "@triggerBody()?['Connection']",
    "sql-@{parameters('Tenant')}",
    "@items('For_each')?['connectionName']",
  ])('applies the authored expression without changing its text: %s', async (value) => {
    renderPanel();
    await expressionMode();
    await edit(value);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(mocks.expressionUpdate).toHaveBeenCalledWith({ nodeId: 'action', expression: value, designTimeReferenceKey: undefined })
    );
  });

  it.each(['SqlDesign', "@@parameters('ConnectionName')", '@outputs(', ''])('blocks invalid or literal authoring: %s', async (value) => {
    renderPanel();
    await expressionMode();
    await edit(value);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(screen.getByText(/Enter a valid workflow expression/)).toBeInTheDocument();
    expect(mocks.expressionUpdate).not.toHaveBeenCalled();
  });

  it('uses exact reference keys for optional design-time selection and can clear it without changing the expression', async () => {
    mocks.state.connections.connectionsMapping.action = { kind: 'expression', expression, designTimeReferenceKey: 'SqlDesign' };
    renderPanel();
    const select = screen.getByRole('combobox', { name: 'Design-time connection (optional)' });
    expect(screen.getByRole('option', { name: 'SqlDesign' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'sqldesign' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'unrelated' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Friendly label' })).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'sqldesign' } });
    expect(mocks.dispatch).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(mocks.expressionUpdate).toHaveBeenCalledWith({ nodeId: 'action', expression, designTimeReferenceKey: undefined })
    );
  });

  it('cancel discards both the editor draft and design-time selection', async () => {
    renderPanel();
    await expressionMode();
    await edit(expression);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'SqlDesign' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mocks.expressionUpdate).not.toHaveBeenCalled();
    expect(mocks.staticUpdate).not.toHaveBeenCalled();
    expect(mocks.state.connections.connectionsMapping.action).toBeNull();
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'openPanel', payload: { nodeId: 'action', panelMode: 'Operation' } });
  });

  it('reports incomplete setup when applying the binding fails during metadata loading', async () => {
    renderPanel();
    await expressionMode();
    await edit(expression);
    mocks.dispatch.mockImplementationOnce(() => ({ unwrap: () => Promise.reject(new Error('Metadata load failed')) }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(
      await screen.findByText('Connection expression setup did not finish. Check the design-time connection and try again.')
    ).toBeInTheDocument();
    expect(mocks.expressionUpdate).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled());
    expect(mocks.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'openPanel' }));
  });

  it.each(['SqlDesign', 'sqldesign'])('applies the exact design-time key %s without replacing the expression', async (key) => {
    renderPanel();
    await expressionMode();
    await edit(expression);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: key } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(mocks.expressionUpdate).toHaveBeenCalledWith({ nodeId: 'action', expression, designTimeReferenceKey: key }));
    expect(mocks.staticUpdate).not.toHaveBeenCalled();
  });

  it('preserves imported expressions when the flag is off without auto-creating a connection', () => {
    mocks.state.designerOptions.hostOptions.enableServiceProviderConnectionExpressions = false;
    mocks.state.connections.connectionsMapping.action = { kind: 'expression', expression };
    renderPanel();
    expect(screen.getByRole('textbox', { name: 'Connection expression' })).toHaveTextContent(expression);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(mocks.autoCreate).not.toHaveBeenCalled();
  });

  it('respects read-only mode without auto-creating connections', async () => {
    mocks.state.designerOptions.readOnly = true;
    mocks.state.connections.connectionsMapping.action = { kind: 'expression', expression };
    renderPanel();
    expect(screen.getByRole('radio', { name: 'Existing connection' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Connection expression' })).toHaveAttribute('contenteditable', 'false');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(mocks.autoCreate).not.toHaveBeenCalled();
  });

  it('can intentionally replace an expression with an existing concrete connection', () => {
    mocks.state.connections.connectionsMapping.action = { kind: 'expression', expression, designTimeReferenceKey: 'SqlDesign' };
    renderPanel();
    fireEvent.click(screen.getByRole('radio', { name: 'Existing connection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select SqlDesign' }));
    expect(mocks.staticUpdate).toHaveBeenCalled();
    expect(mocks.expressionUpdate).not.toHaveBeenCalled();
  });

  it('connects the real string editor to the normal dynamic token conversion without changing workflow state', async () => {
    renderPanel();
    await expressionMode();
    await edit('');
    act(() => screen.getByRole('textbox', { name: 'Connection expression' }).focus());
    const tokenPickerButton = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        '[data-automation-id="msla-token-picker-entrypoint-button-dynamic-content"]'
      );
      expect(button).not.toBeNull();
      return button!;
    });
    fireEvent.click(tokenPickerButton);
    expect(screen.getByRole('button', { name: 'Output' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Array item connection' })).not.toBeInTheDocument();
    expect(mocks.pickerProps.filteredTokenGroup.flatMap((group: any) => group.tokens)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Array item connection' })])
    );
    fireEvent.click(screen.getByRole('button', { name: 'ConnectionName' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled());
    expect(createValueSegmentFromToken).toHaveBeenCalledWith(
      'action',
      'connectionName',
      expect.anything(),
      false,
      false,
      mocks.state,
      mocks.dispatch
    );
    expect(mocks.pickerProps.tokenGroup[1].tokens[0].title).toBe('Output');
    expect(mocks.dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(mocks.expressionUpdate).toHaveBeenCalledWith({
        nodeId: 'action',
        expression: "@parameters('ConnectionName')",
        designTimeReferenceKey: undefined,
      })
    );
  });
});

describe('runtime connection display', () => {
  it.each([
    ['malformed imported expression', '@if(', undefined, false],
    ['selected design-time connection error', '@triggerBody()', 'SqlDesign', true],
  ] as const)('shows an error for a %s without hiding the runtime expression', (_case, value, designTimeReferenceKey, hasError) => {
    mocks.state.designerOptions.hostOptions.enableServiceProviderConnectionExpressions = false;
    mocks.state.connections.connectionsMapping.action = { kind: 'expression', expression: value, designTimeReferenceKey };
    render(
      <IntlProvider locale="en">
        <ConnectionDisplay nodeId="action" connectionName={undefined} readOnly={false} hasError={hasError} />
      </IntlProvider>
    );

    expect(screen.getByText('Connection selected at runtime')).toBeInTheDocument();
    expect(screen.getByText(value)).toBeInTheDocument();
    expect(screen.getByText('Invalid connection')).toBeInTheDocument();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it('lists runtime-only connections instead of empty state and opens the original action ID', () => {
    mocks.state.designerOptions.hostOptions.enableServiceProviderConnectionExpressions = false;
    mocks.state.connections.connectionReferences = {};
    mocks.state.connections.connectionsMapping = {
      action: { kind: 'expression', expression },
      Unrenamed: { kind: 'expression', expression: "@parameters('ConnectionName')" },
    };
    mocks.state.workflow.idReplacements = { action: 'Renamed action' };
    render(
      <IntlProvider locale="en">
        <AllConnections />
      </IntlProvider>
    );

    expect(screen.getByText('Connections selected at runtime')).toBeInTheDocument();
    expect(screen.getByText(expression)).toBeInTheDocument();
    expect(screen.getByText("@parameters('ConnectionName')")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unrenamed' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'No connections found' })).not.toBeInTheDocument();
    expect(screen.queryByText('Concrete connections')).not.toBeInTheDocument();
    expect(mocks.connectorQuery).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Renamed action' }));
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'openPanel', payload: { nodeId: 'action', panelMode: 'Connection' } });
  });

  it('retains the empty state when there are no static or runtime connection mappings', () => {
    mocks.state.connections.connectionsMapping = {};
    mocks.state.connections.connectionReferences = {};
    render(
      <IntlProvider locale="en">
        <AllConnections />
      </IntlProvider>
    );

    expect(screen.getByRole('region', { name: 'No connections found' })).toBeInTheDocument();
    expect(screen.queryByText('Connections selected at runtime')).not.toBeInTheDocument();
  });

  it('shows the imported expression instead of invalid/missing/loading state without opening the panel', () => {
    mocks.state.designerOptions.hostOptions.enableServiceProviderConnectionExpressions = false;
    mocks.state.connections.connectionsMapping.action = { kind: 'expression', expression };
    render(
      <IntlProvider locale="en">
        <ConnectionDisplay nodeId="action" connectionName={undefined} readOnly={false} hasError isLoading />
      </IntlProvider>
    );
    expect(screen.getByText('Connection selected at runtime')).toBeInTheDocument();
    expect(screen.getByText(expression)).toBeInTheDocument();
    expect(screen.queryByText('Invalid connection')).not.toBeInTheDocument();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
