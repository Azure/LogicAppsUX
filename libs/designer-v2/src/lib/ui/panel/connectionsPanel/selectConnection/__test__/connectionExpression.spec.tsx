import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IntlProvider } from 'react-intl';
import type { ComponentProps, PropsWithChildren } from 'react';
import type { CreateConnectionWrapper } from '../../createConnection/createConnectionWrapper';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  connectionExpressionEditor,
} from '../../../../../../../../designer-ui/__test__/connection-expression-editor-helper';
import { SelectConnectionWrapper } from '../selectConnection';
import { createValueSegmentFromToken } from '../../../../../core/utils/tokens';
import { createConnectionExpressionState } from './connectionExpressionTestState';

const mocks = vi.hoisted(() => ({
  state: {} as any,
  dispatch: vi.fn((_action?: { type: string; payload?: unknown }) => ({ unwrap: () => Promise.resolve() })),
  autoCreate: vi.fn(),
  createConnection: vi.fn(),
  setupConnection: vi.fn(),
  expressionUpdate: vi.fn((payload) => ({ type: 'expression', payload })),
  staticUpdate: vi.fn((payload) => ({ type: 'static', payload })),
  query: { data: [] as any[], isLoading: false, isError: false, error: undefined as Error | undefined },
  selectedNodeIds: ['action'],
  pickerProps: undefined as any,
}));

vi.mock('react-redux', () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector: (state: any) => unknown) => selector(mocks.state),
}));
vi.mock('../../../../../core/actions/bjsworkflow/connections', () => ({
  autoCreateConnectionIfPossible: mocks.autoCreate,
  updateNodeConnectionExpression: mocks.expressionUpdate,
  updateNodeConnection: mocks.staticUpdate,
}));
vi.mock('../../../../../core/state/connection/connectionSelector', () => ({
  useNodeConnectionMapping: () => mocks.state.connections.connectionsMapping.action,
  useNodeConnectionId: () => '/connections/SqlDesign',
  useConnectionRefs: () => mocks.state.connections.connectionReferences,
  useConnectionRefsByConnectorId: () => [],
  useConnectorByNodeId: () => ({ id: '/serviceProviders/sql', name: 'sql', properties: { iconUri: 'https://example.com/sql.svg' } }),
}));
vi.mock('../../../../../core/state/panel/panelSelectors', () => ({
  useConnectionPanelSelectedNodeIds: () => mocks.selectedNodeIds,
  useIsCreatingConnection: () => mocks.state.panel.isCreatingConnection,
  useOperationPanelSelectedNodeId: () => 'action',
  usePreviousPanelMode: () => 'Operation',
}));
vi.mock('../../../../../core/state/panel/panelSlice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../../core/state/panel/panelSlice')>()),
  openPanel: (payload: unknown) => ({ type: 'openPanel', payload }),
  setIsCreatingConnection: (payload: unknown) => ({ type: 'createPanel', payload }),
}));
vi.mock('../../../../../core/state/designerView/designerViewSelectors', () => ({ useIsA2AWorkflow: () => false }));
vi.mock('../../../../../common/hooks/agent', () => ({ useIsAgentSubGraph: () => false }));
vi.mock('../../../../../core/queries/connections', () => ({ useConnectionsForConnector: () => mocks.query }));
vi.mock('../../actionList/actionList', () => ({
  ActionList: ({ nodeIds, iconUri }: { nodeIds: string[]; iconUri: string }) => (
    <div data-testid="connection-action-bar">
      <img alt="Action connector" src={iconUri} />
      {nodeIds.join(',')}
    </div>
  ),
}));
vi.mock('../../createConnection/createConnectionWrapper', () => ({
  CreateConnectionWrapper: ({ showActionBar, onConnectionCancelled, onCreatingChange }: ComponentProps<typeof CreateConnectionWrapper>) => (
    <div data-testid="create-connection-form" data-show-action-bar={String(showActionBar)}>
      <button type="button" onClick={onConnectionCancelled}>
        Cancel creation
      </button>
      <button type="button" onClick={() => onCreatingChange?.(true)}>
        Start creation
      </button>
      <button type="button" onClick={() => onCreatingChange?.(false)}>
        Finish creation
      </button>
    </div>
  ),
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
  ConnectionService: () => ({ setupConnectionIfNeeded: mocks.setupConnection, createConnection: mocks.createConnection }),
  LoggerService: () => ({ log: vi.fn() }),
}));
vi.mock('../../../../../core/utils/tokens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../../core/utils/tokens')>()),
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
  createValueSegmentFromToken: vi.fn(async (_nodeId, _parameterId, token) => {
    const { loadParameterValueFromString } = await import('../../../../../core/utils/parameters/helper');
    return loadParameterValueFromString(`@${token.value}`)[0];
  }),
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
const IntlWrapper = ({ children }: PropsWithChildren) => <IntlProvider locale="en">{children}</IntlProvider>;
const renderPanel = () => {
  const result = render(<SelectConnectionWrapper />, { wrapper: IntlWrapper });
  return { ...result, rerenderPanel: () => result.rerender(<SelectConnectionWrapper />) };
};
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
  fireEvent.click(screen.getByRole('tab', { name: 'Use expression' }));
  await waitFor(() => expect(connectionExpressionEditor.current).toBeDefined());
};
const selectDesignTimeConnection = async (name: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: 'Design-time connection (optional)' }));
  fireEvent.click(await screen.findByRole('option', { name }));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'ResizeObserver',
    vi.fn(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }))
  );
  mocks.dispatch.mockImplementation((action) => {
    if (action?.type === 'createPanel') {
      mocks.state.panel.isCreatingConnection = action.payload;
    }
    return { unwrap: () => Promise.resolve() };
  });
  connectionExpressionEditor.current = undefined;
  mocks.selectedNodeIds = ['action'];
  mocks.pickerProps = undefined;
  mocks.query = { data: [], isLoading: false, isError: false, error: undefined };
  const initialState = createConnectionExpressionState();
  mocks.state = {
    ...initialState,
    designerOptions: { ...initialState.designerOptions, readOnly: false, isMonitoringView: false, hostOptions: {} },
    workflow: {
      ...initialState.workflow,
      workflowKind: 'stateful',
      nodesMetadata: { ...initialState.workflow.nodesMetadata, action: { graphId: 'root', isTrigger: false } },
      operations: { ...initialState.workflow.operations, action: { type: 'ServiceProvider' } },
      idReplacements: {},
    },
    operations: {
      ...initialState.operations,
      operationInfo: { action: { type: 'ServiceProvider', connectorId: '/serviceProviders/sql' } },
    },
    connections: {
      ...initialState.connections,
      connectionsMapping: { action: null },
      connectionReferences: {
        SqlDesign: { api: { id: '/serviceProviders/sql' }, connection: { id: '/connections/SqlDesign' }, connectionName: 'Friendly label' },
        sqldesign: { api: { id: '/serviceProviders/sql' }, connection: { id: '/connections/sqldesign' } },
        unrelated: { api: { id: '/serviceProviders/blob' }, connection: { id: '/connections/blob' } },
      },
    },
    workflowParameters: {
      ...initialState.workflowParameters,
      definitions: {
        ...initialState.workflowParameters.definitions,
        ConnectionName: { name: 'ConnectionName', isEditable: true, type: 'String', value: 'SqlDesign' },
      },
    },
    panel: { ...initialState.panel, isCreatingConnection: false },
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('connection selection tabs', () => {
  it('renders one shared action bar before the ordered tabs without radio mode controls or a footer Add new button', () => {
    renderPanel();

    const actionBar = screen.getByTestId('connection-action-bar');
    const tabs = screen.getByRole('tablist', { name: 'Connection options' });
    expect(actionBar).toHaveTextContent('action');
    expect(within(actionBar).getByRole('img', { name: 'Action connector' })).toHaveAttribute('src', 'https://example.com/sql.svg');
    expect(actionBar.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const divider = screen.getByRole('separator');
    expect(actionBar.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(divider.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(tabs).getAllByRole('tab')).toEqual([
      screen.getByRole('tab', { name: 'Select existing' }),
      screen.getByRole('tab', { name: 'Create new' }),
      screen.getByRole('tab', { name: 'Use expression' }),
    ]);
    expect(screen.getByRole('tabpanel', { name: 'Select existing' })).toBeVisible();
    expect(screen.getByText('Select an existing connection', { exact: true })).toBeVisible();
    expect(screen.queryByText('Select an existing connection or create a new one')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Add new' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByText('Connection mode')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a new connection' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add new' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Connection expression', hidden: true })).not.toBeInTheDocument();
  });

  it('retains Select existing and Create new tabs when expression authoring is unsupported', () => {
    mocks.state.operations.operationInfo.action.type = 'ApiConnection';
    renderPanel();

    expect(screen.getAllByRole('tab')).toEqual([
      screen.getByRole('tab', { name: 'Select existing' }),
      screen.getByRole('tab', { name: 'Create new' }),
    ]);
    expect(screen.getByRole('tab', { name: 'Select existing' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Select SqlDesign' })).toBeVisible();
  });

  it('defaults imported expressions to Use expression with their design-time selection', () => {
    mocks.state.connections.connectionsMapping.action = { kind: 'expression', expression, designTimeReferenceKey: 'SqlDesign' };
    renderPanel();

    expect(screen.getByRole('tab', { name: 'Use expression' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Select existing' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tabpanel', { name: 'Use expression' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Design-time connection (optional)' })).toHaveTextContent('SqlDesign');
    expect(within(screen.getByRole('textbox', { name: 'Connection expression' })).getByTitle(expression.substring(1))).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Select SqlDesign' })).not.toBeInTheDocument();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it('opens the creation form from Create new without implicitly creating or applying a connection, then cancels back', () => {
    const { rerenderPanel } = renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Create new' }));
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'createPanel', payload: true });
    rerenderPanel();

    expect(screen.getByRole('tab', { name: 'Create new' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Create new' })).toBeVisible();
    expect(screen.getByTestId('create-connection-form')).toHaveAttribute('data-show-action-bar', 'false');
    expect(screen.getAllByTestId('connection-action-bar')).toHaveLength(1);
    expect(mocks.autoCreate).not.toHaveBeenCalled();
    expect(mocks.createConnection).not.toHaveBeenCalled();
    expect(mocks.setupConnection).not.toHaveBeenCalled();
    expect(mocks.staticUpdate).not.toHaveBeenCalled();
    expect(mocks.expressionUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel creation' }));
    rerenderPanel();
    expect(mocks.dispatch).toHaveBeenLastCalledWith({ type: 'createPanel', payload: false });
    expect(screen.getByRole('tab', { name: 'Select existing' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByTestId('create-connection-form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select SqlDesign' })).toBeVisible();
    expect(mocks.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'openPanel' }));
  });

  it('honors an existing Redux creation flag and clears it when navigating back to Select existing', () => {
    mocks.state.panel.isCreatingConnection = true;
    const { rerenderPanel } = renderPanel();

    expect(screen.getByRole('tab', { name: 'Create new' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('create-connection-form')).toBeVisible();
    expect(mocks.autoCreate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'Select existing' }));
    rerenderPanel();
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'createPanel', payload: false });
    expect(screen.getByRole('tab', { name: 'Select existing' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByTestId('create-connection-form')).not.toBeInTheDocument();
  });

  it.each(['cancel', 'Use expression'] as const)(
    'preserves the same expression editor and design-time draft across existing and new tabs, returning through %s',
    async (returnPath) => {
      const { rerenderPanel } = renderPanel();
      await expressionMode();
      await edit(expression);
      await selectDesignTimeConnection('sqldesign');
      const editor = screen.getByRole('textbox', { name: 'Connection expression' });
      const lexicalEditor = connectionExpressionEditor.current;

      fireEvent.click(screen.getByRole('tab', { name: 'Select existing' }));
      expect(editor).toBeInTheDocument();
      expect(editor).not.toBeVisible();
      expect(screen.queryByRole('textbox', { name: 'Connection expression' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select SqlDesign' })).toBeVisible();
      await expressionMode();
      expect(screen.getByRole('textbox', { name: 'Connection expression' })).toBe(editor);
      expect(screen.getByRole('combobox')).toHaveTextContent('sqldesign');

      fireEvent.click(screen.getByRole('tab', { name: 'Create new' }));
      rerenderPanel();
      expect(editor).toBeInTheDocument();
      expect(editor).not.toBeVisible();
      expect(screen.getByTestId('create-connection-form')).toBeVisible();
      if (returnPath === 'cancel') {
        fireEvent.click(screen.getByRole('button', { name: 'Cancel creation' }));
      } else {
        fireEvent.click(screen.getByRole('tab', { name: returnPath }));
      }
      rerenderPanel();

      expect(screen.getByRole('tab', { name: 'Use expression' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('textbox', { name: 'Connection expression' })).toBe(editor);
      expect(connectionExpressionEditor.current).toBe(lexicalEditor);
      expect(editor).toHaveTextContent(expression);
      expect(editor.querySelector('[data-automation-id^="msla-token "]')).toBeNull();
      expect(screen.getByRole('combobox')).toHaveTextContent('sqldesign');
      expect(mocks.staticUpdate).not.toHaveBeenCalled();
      expect(mocks.expressionUpdate).not.toHaveBeenCalled();
      expect(mocks.autoCreate).not.toHaveBeenCalled();
      expect(mocks.createConnection).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      await waitFor(() =>
        expect(mocks.expressionUpdate).toHaveBeenCalledExactlyOnceWith({
          nodeId: 'action',
          expression,
          designTimeReferenceKey: 'sqldesign',
        })
      );
    }
  );

  it.each(['loading', 'error'] as const)('keeps all tabs and the action bar available when the existing list is %s', async (status) => {
    mocks.query.isLoading = status === 'loading';
    mocks.query.isError = status === 'error';
    mocks.query.error = status === 'error' ? new Error('Cannot load connections') : undefined;
    const { rerenderPanel } = renderPanel();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText(status === 'loading' ? 'Loading connection data...' : 'Error loading connections')).toBeVisible();
    if (status === 'error') {
      expect(screen.getByText('Cannot load connections')).toBeVisible();
    }

    await expressionMode();
    expect(screen.getByRole('textbox', { name: 'Connection expression' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Create new' }));
    rerenderPanel();
    expect(screen.getByTestId('create-connection-form')).toBeVisible();
    expect(screen.getAllByTestId('connection-action-bar')).toHaveLength(1);
    expect(mocks.autoCreate).not.toHaveBeenCalled();
  });

  it('shows the expression label and subheading while preserving the editor accessible label association', async () => {
    renderPanel();
    await expressionMode();
    const label = screen.getByText('Connection expression', { selector: 'label' });
    const editor = screen.getByRole('textbox', { name: 'Connection expression' });

    expect(label).toBeVisible();
    expect(label.id).not.toBe('');
    expect(editor.getAttribute('aria-labelledby')?.split(' ')).toContain(label.id);
    expect(screen.getAllByText('Connection expression')).toHaveLength(1);
    expect(screen.getByText('Use an expression to dynamically select a connection at runtime')).toBeVisible();
    expect(
      screen.queryByText('The expression selects a connection at runtime. No connection is created by the designer.')
    ).not.toBeInTheDocument();
  });

  it('lists exact case-sensitive names for the current connector without turning examples into selectable controls', async () => {
    renderPanel();
    await expressionMode();
    const list = screen.getByRole('list', { name: 'Existing connection names (case-sensitive)' });
    const label = screen.getByText('Existing connection names (case-sensitive)');

    expect(list.tagName).toBe('UL');
    expect(list).toHaveAttribute('aria-labelledby', label.id);
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['SqlDesign', 'sqldesign']);
    expect(within(list).queryByText('unrelated')).not.toBeInTheDocument();
    expect(within(list).queryByText('Friendly label')).not.toBeInTheDocument();
    expect(list.querySelector('button, a, input, select, [tabindex]')).toBeNull();
    fireEvent.click(within(list).getByText('SqlDesign'));
    expect(screen.getByRole('combobox', { name: 'Design-time connection (optional)' })).toHaveTextContent('None');
    expect(mocks.state.connections.connectionsMapping.action).toBeNull();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it.each(['no references', 'only another connector'] as const)(
    'omits the example heading and list when there are %s while retaining the None dropdown option',
    async (scenario) => {
      const unrelated = mocks.state.connections.connectionReferences.unrelated;
      mocks.state.connections.connectionReferences = scenario === 'no references' ? {} : { unrelated };
      renderPanel();
      await expressionMode();

      expect(screen.queryByText('Existing connection names (case-sensitive)')).not.toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Existing connection names (case-sensitive)' })).not.toBeInTheDocument();
      const dropdown = screen.getByRole('combobox', { name: 'Design-time connection (optional)' });
      expect(dropdown).toHaveTextContent('None');
      fireEvent.click(dropdown);
      expect(await screen.findByRole('option', { name: 'None' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getAllByRole('option')).toHaveLength(1);
      fireEvent.click(screen.getByRole('option', { name: 'None' }));
      expect(mocks.dispatch).not.toHaveBeenCalled();
    }
  );

  it('retains every full example name in the capped scrolling list', async () => {
    const reference = mocks.state.connections.connectionReferences.SqlDesign;
    const names = Array.from({ length: 30 }, (_, index) => `Sql_connection_${index}_full_case_sensitive_name`);
    mocks.state.connections.connectionReferences = Object.fromEntries(names.map((name) => [name, reference]));
    renderPanel();
    await expressionMode();
    const list = screen.getByRole('list', { name: 'Existing connection names (case-sensitive)' });

    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(names);
    expect(list).toHaveStyle({ maxHeight: '96px', overflowY: 'auto' });
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it('centers the expression Apply and Cancel actions together', async () => {
    renderPanel();
    await expressionMode();
    const apply = screen.getByRole('button', { name: 'Apply' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });

    expect(apply.parentElement).toBe(cancel.parentElement);
    expect(apply.parentElement).toHaveStyle({ display: 'flex', justifyContent: 'center' });
  });

  it('disables all tabs until applying the expression finishes', async () => {
    renderPanel();
    await expressionMode();
    await edit(expression);
    let finishApply: (() => void) | undefined;
    const applying = new Promise<void>((resolve) => {
      finishApply = resolve;
    });
    mocks.dispatch.mockImplementationOnce(() => ({ unwrap: () => applying }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toBeDisabled();
      fireEvent.click(tab);
    }
    expect(screen.getByRole('tabpanel', { name: 'Use expression' })).toBeVisible();
    expect(screen.queryByTestId('create-connection-form')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    const dropdown = screen.getByRole('combobox', { name: 'Design-time connection (optional)' });
    expect(dropdown).toBeDisabled();
    fireEvent.click(dropdown);
    expect(screen.queryByRole('listbox', { name: 'Design-time connection (optional)' })).not.toBeInTheDocument();
    expect(mocks.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'createPanel' }));

    await act(async () => finishApply?.());
    await waitFor(() => {
      for (const tab of screen.getAllByRole('tab')) {
        expect(tab).toBeEnabled();
      }
    });
    expect(dropdown).toBeEnabled();
    expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'openPanel', payload: { nodeId: 'action', panelMode: 'Operation' } });
  });

  it('disables all tabs while the creation child is busy and unlocks them when it finishes', () => {
    mocks.state.panel.isCreatingConnection = true;
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Start creation' }));

    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toBeDisabled();
      fireEvent.click(tab);
    }
    expect(screen.getByRole('tabpanel', { name: 'Create new' })).toBeVisible();
    expect(screen.getByTestId('create-connection-form')).toBeVisible();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Finish creation' }));
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toBeEnabled();
    }
    expect(screen.getByRole('tab', { name: 'Create new' })).toHaveAttribute('aria-selected', 'true');
  });

  it.each(['readOnly', 'isMonitoringView'] as const)('does not open a flagged creation form in %s mode', (mode) => {
    mocks.state.designerOptions[mode] = true;
    mocks.state.panel.isCreatingConnection = true;
    renderPanel();

    expect(screen.getByRole('tabpanel', { name: 'Select existing' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Create new' })).toBeDisabled();
    expect(screen.queryByTestId('create-connection-form')).not.toBeInTheDocument();
    expect(mocks.autoCreate).not.toHaveBeenCalled();
    expect(mocks.createConnection).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it.each(['readOnly', 'isMonitoringView'] as const)(
    'falls back to the existing list rather than a blank panel when %s becomes active during expression authoring',
    async (mode) => {
      const { rerenderPanel } = renderPanel();
      await expressionMode();
      await edit(expression);
      expect(screen.getByRole('tabpanel', { name: 'Use expression' })).toBeVisible();

      mocks.state.designerOptions[mode] = true;
      rerenderPanel();

      expect(screen.queryByRole('tab', { name: 'Use expression' })).not.toBeInTheDocument();
      expect(screen.getByRole('tabpanel', { name: 'Select existing' })).toBeVisible();
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Select SqlDesign' })).toBeVisible();
      expect(screen.getByRole('tab', { name: 'Create new' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Select SqlDesign' }));
      expect(mocks.staticUpdate).not.toHaveBeenCalled();
      expect(mocks.expressionUpdate).not.toHaveBeenCalled();
      expect(mocks.autoCreate).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    }
  );
});

describe('connection expression selection', () => {
  it('rehydrates a saved plaintext parameter expression as a real token after closing and remounting without changing serialization', async () => {
    const savedExpression = "@parameters('Test_variable_1234')";
    const firstPanel = renderPanel();
    await expressionMode();
    await edit(savedExpression);
    const draftEditor = screen.getByRole('textbox', { name: 'Connection expression' });
    expect(draftEditor).toHaveTextContent(savedExpression);
    expect(draftEditor.querySelector('[data-automation-id^="msla-token "]')).toBeNull();
    await selectDesignTimeConnection('SqlDesign');
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(mocks.expressionUpdate).toHaveBeenCalledExactlyOnceWith({
        nodeId: 'action',
        expression: savedExpression,
        designTimeReferenceKey: 'SqlDesign',
      })
    );
    await waitFor(() =>
      expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'openPanel', payload: { nodeId: 'action', panelMode: 'Operation' } })
    );

    const savedBinding = mocks.expressionUpdate.mock.calls[0][0];
    firstPanel.unmount();
    expect(draftEditor).not.toBeInTheDocument();
    mocks.state.connections.connectionsMapping.action = {
      kind: 'expression',
      expression: savedBinding.expression,
      designTimeReferenceKey: savedBinding.designTimeReferenceKey,
    };
    mocks.expressionUpdate.mockClear();
    mocks.dispatch.mockClear();
    connectionExpressionEditor.current = undefined;
    renderPanel();

    expect(screen.getByRole('tab', { name: 'Use expression' })).toHaveAttribute('aria-selected', 'true');
    const reopenedEditor = screen.getByRole('textbox', { name: 'Connection expression' });
    expect(reopenedEditor).not.toBe(draftEditor);
    const token = await within(reopenedEditor).findByTitle("parameters('Test_variable_1234')");
    expect(token).toHaveAttribute('data-automation-id', 'msla-token msla-input-token-Test_variable_1234');
    expect(token).toHaveTextContent('Test_variable_1234');
    expect(token).toBeVisible();
    expect(reopenedEditor).not.toHaveTextContent(savedExpression);
    expect(screen.getByRole('combobox', { name: 'Design-time connection (optional)' })).toHaveTextContent('SqlDesign');
    expect(mocks.dispatch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('tab', { name: 'Select existing' }));
    await expressionMode();
    expect(within(screen.getByRole('textbox', { name: 'Connection expression' })).getByTitle("parameters('Test_variable_1234')")).toBe(
      token
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(mocks.expressionUpdate).toHaveBeenCalledExactlyOnceWith({
        nodeId: 'action',
        expression: savedExpression,
        designTimeReferenceKey: 'SqlDesign',
      })
    );
    expect(mocks.staticUpdate).not.toHaveBeenCalled();
    expect(mocks.autoCreate).not.toHaveBeenCalled();
    expect(mocks.createConnection).not.toHaveBeenCalled();
  });

  it.each<[string, () => void]>([
    [
      'read-only mode',
      () => {
        mocks.state.designerOptions.readOnly = true;
      },
    ],
    [
      'monitoring mode',
      () => {
        mocks.state.designerOptions.isMonitoringView = true;
      },
    ],
    [
      'missing operation metadata',
      () => {
        delete mocks.state.operations.operationInfo.action;
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
    expect(screen.queryByRole('tab', { name: 'Use expression' })).not.toBeInTheDocument();
  });

  it.each(['stateful', 'stateless'])(
    'offers expression authoring by default for Standard %s with ordinary host options and no connections',
    (workflowKind) => {
      mocks.state.workflow.workflowKind = workflowKind;
      renderPanel();
      expect(mocks.state.designerOptions.hostOptions).toEqual({});
      expect(screen.getByRole('tab', { name: 'Use expression' })).toBeEnabled();
      expect(screen.getByRole('tab', { name: 'Select existing' })).toHaveAttribute('aria-selected', 'true');
      expect(mocks.autoCreate).not.toHaveBeenCalled();
    }
  );

  it('defaults bulk reassignment to Select existing when the first action has a runtime expression', () => {
    mocks.selectedNodeIds = ['action', 'second'];
    mocks.state.workflow.nodesMetadata.second = { isTrigger: false };
    mocks.state.operations.operationInfo.second = { type: 'ServiceProvider', connectorId: '/serviceProviders/sql' };
    mocks.state.connections.connectionsMapping = {
      action: { kind: 'expression', expression },
      second: 'SqlDesign',
    };
    const originalMappings = structuredClone(mocks.state.connections.connectionsMapping);
    renderPanel();

    expect(screen.getByRole('tab', { name: 'Select existing' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Create new' })).toBeEnabled();
    expect(screen.queryByRole('tab', { name: 'Use expression', hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Connection expression', hidden: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply', hidden: true })).not.toBeInTheDocument();
    const existingPanel = screen.getByRole('tabpanel', { name: 'Select existing' });
    expect(existingPanel).toBeVisible();
    expect(within(existingPanel).getByText('Select an existing connection')).toBeVisible();
    const selectConnection = within(existingPanel).getByRole('button', { name: 'Select SqlDesign' });
    expect(selectConnection).toBeEnabled();
    expect(mocks.expressionUpdate).not.toHaveBeenCalled();
    expect(mocks.staticUpdate).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.autoCreate).not.toHaveBeenCalled();
    expect(mocks.state.connections.connectionsMapping).toEqual(originalMappings);

    fireEvent.click(selectConnection);
    expect(mocks.staticUpdate).toHaveBeenCalledTimes(2);
    for (const [index, nodeId] of mocks.selectedNodeIds.entries()) {
      expect(mocks.staticUpdate).toHaveBeenNthCalledWith(index + 1, {
        nodeId,
        connection: { id: '/connections/SqlDesign' },
        connector: expect.objectContaining({ id: '/serviceProviders/sql' }),
      });
    }
    expect(mocks.expressionUpdate).not.toHaveBeenCalled();
    expect(mocks.autoCreate).not.toHaveBeenCalled();
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
    fireEvent.click(select);
    const listbox = await screen.findByRole('listbox', { name: 'Design-time connection (optional)' });
    expect(screen.getByRole('tabpanel', { name: 'Use expression' })).not.toContainElement(listbox);
    expect(screen.getByRole('option', { name: 'SqlDesign' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'sqldesign' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByRole('option', { name: 'unrelated' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Friendly label' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'sqldesign' }));
    expect(select).toHaveTextContent('sqldesign');
    fireEvent.click(select);
    expect(screen.getByRole('option', { name: 'SqlDesign' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('option', { name: 'sqldesign' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('option', { name: 'None' }));
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(select).toHaveTextContent('None');
    fireEvent.click(select);
    expect(screen.getByRole('option', { name: 'None' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'SqlDesign' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('option', { name: 'sqldesign' })).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(screen.getByRole('option', { name: 'None' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(mocks.expressionUpdate).toHaveBeenCalledWith({ nodeId: 'action', expression, designTimeReferenceKey: undefined })
    );
  });

  it('cancel discards both the editor draft and design-time selection', async () => {
    renderPanel();
    await expressionMode();
    await edit(expression);
    await selectDesignTimeConnection('SqlDesign');
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
    expect(screen.getByRole('combobox', { name: 'Design-time connection (optional)' })).toBeEnabled();
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toBeEnabled();
    }
    expect(mocks.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'openPanel' }));
  });

  it.each(['SqlDesign', 'sqldesign'])('applies the exact design-time key %s without replacing the expression', async (key) => {
    renderPanel();
    await expressionMode();
    await edit(expression);
    await selectDesignTimeConnection(key);
    expect(screen.getByRole('combobox', { name: 'Design-time connection (optional)' })).toHaveTextContent(key);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(mocks.expressionUpdate).toHaveBeenCalledWith({ nodeId: 'action', expression, designTimeReferenceKey: key }));
    expect(mocks.staticUpdate).not.toHaveBeenCalled();
  });

  it.each<[string, () => void]>([
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
      'managed API',
      () => {
        mocks.state.operations.operationInfo.action.type = 'ApiConnection';
      },
    ],
  ])('preserves imported expressions in unsupported %s context without auto-creating a connection', (_context, configure) => {
    configure();
    mocks.state.connections.connectionsMapping.action = { kind: 'expression', expression };
    renderPanel();
    const editor = screen.getByRole('textbox', { name: 'Connection expression' });
    expect(editor).toHaveAttribute('contenteditable', 'false');
    expect(within(editor).getByTitle(expression.substring(1))).toBeVisible();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Design-time connection (optional)' })).toBeDisabled();
    expect(mocks.autoCreate).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.expressionUpdate).not.toHaveBeenCalled();
  });

  it.each(['readOnly', 'isMonitoringView'] as const)('respects %s without auto-creating or mutating connections', (mode) => {
    mocks.state.designerOptions[mode] = true;
    mocks.state.connections.connectionsMapping.action = { kind: 'expression', expression };
    renderPanel();
    expect(screen.getByRole('tab', { name: 'Select existing' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Create new' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Use expression' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Connection expression' })).toHaveAttribute('contenteditable', 'false');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    const dropdown = screen.getByRole('combobox', { name: 'Design-time connection (optional)' });
    expect(dropdown).toBeDisabled();
    fireEvent.click(dropdown);
    expect(screen.queryByRole('listbox', { name: 'Design-time connection (optional)' })).not.toBeInTheDocument();
    expect(mocks.autoCreate).not.toHaveBeenCalled();
    expect(mocks.staticUpdate).not.toHaveBeenCalled();
    expect(mocks.expressionUpdate).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it.each(['readOnly', 'isMonitoringView'] as const)(
    'blocks static selection and auto-create in %s even without an imported expression',
    (mode) => {
      mocks.state.designerOptions[mode] = true;
      renderPanel();
      expect(screen.queryByRole('tab', { name: 'Use expression' })).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Create new' })).toBeDisabled();
      fireEvent.click(screen.getByRole('tab', { name: 'Create new' }));
      expect(screen.queryByTestId('create-connection-form')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Select SqlDesign' }));
      expect(mocks.staticUpdate).not.toHaveBeenCalled();
      expect(mocks.setupConnection).not.toHaveBeenCalled();
      expect(mocks.autoCreate).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    }
  );

  it('can intentionally replace an expression with an existing concrete connection', () => {
    mocks.state.connections.connectionsMapping.action = { kind: 'expression', expression, designTimeReferenceKey: 'SqlDesign' };
    renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Select existing' }));
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
