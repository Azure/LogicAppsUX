/**
 * @vitest-environment jsdom
 */
import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import { InitLoggerService } from '@microsoft/logic-apps-shared';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReadOnlyWorkflowGraphData } from '../../../ReadOnlyWorkflowGraph';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workflow } from '../../../../common/models/workflow';
import type {
  WorkflowExtractionPlan,
  WorkflowExtractionResult,
  WorkflowExtractionService,
} from '../../../../common/models/workflowExtraction';
import { ProviderWrappedContext } from '../../../../core/ProviderWrappedContext';
import { serializeWorkflow } from '../../../../core/actions/bjsworkflow/serializer';
import {
  commitWorkflowExtraction,
  getExtractionSelectedIds,
  workflowExtractionFingerprint,
} from '../../../../core/actions/bjsworkflow/workflowExtraction';
import { setWorkflowExtractionDialogOpen } from '../../../../core/state/designerView/designerViewSlice';
import { setFocusNode } from '../../../../core/state/workflow/workflowSlice';
import { Deserialize } from '../../../../core/parsers/BJSWorkflow/BJSDeserializer';
import { buildWorkflowExtractionPlan } from '../../../../core/utils/workflowExtraction';
import { getWorkflowExtractionSelection } from '../../../../core/utils/workflowExtractionSelection';
import { WorkflowExtractionAction, WorkflowExtractionDialog } from '../workflowExtraction';
import { getWorkflowExtractionPreview } from '../workflowExtractionPreview';

const nativePreview = vi.hoisted(() => ({ render: vi.fn() }));

vi.mock('@fluentui/react-components', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fluentui/react-components')>();
  const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    ...actual,
    Accordion: passthrough,
    AccordionHeader: passthrough,
    AccordionItem: passthrough,
    AccordionPanel: passthrough,
    Button: actual.Button,
    mergeClasses: actual.mergeClasses,
    Dialog: ({
      children,
      modalType,
      onOpenChange,
      open,
    }: {
      children?: ReactNode;
      modalType?: string;
      onOpenChange?: (event: unknown, data: { open: boolean }) => void;
      open?: boolean;
    }) =>
      open ? (
        <div role="dialog" data-modal-type={modalType}>
          {children}
          <button type="button" aria-label="Dismiss dialog" onClick={() => onOpenChange?.(undefined, { open: false })} />
        </div>
      ) : null,
    DialogActions: passthrough,
    DialogBody: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: ReactNode;
    }) => <div {...props}>{children}</div>,
    DialogContent: passthrough,
    DialogSurface: passthrough,
    DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
    Field: ({
      children,
      label,
      validationMessage,
    }: {
      children?: ReactNode;
      label?: ReactNode;
      validationMessage?: ReactNode;
    }) => (
      <label>
        {label}
        {children}
        {validationMessage ? <span role="alert">{validationMessage}</span> : null}
      </label>
    ),
    Input: ({
      onChange,
      ...props
    }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
      onChange?: (event: unknown, data: { value: string }) => void;
    }) => <input {...props} onChange={(event) => onChange?.(event, { value: event.target.value })} />,
    Link: ({ children, href }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href}>{children}</a>,
    MenuItem: ({
      children,
      icon: _icon,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      icon?: ReactNode;
    }) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
    MessageBar: ({
      children,
      intent,
    }: {
      children?: ReactNode;
      intent?: string;
    }) => <div data-intent={intent}>{children}</div>,
    MessageBarBody: passthrough,
    Spinner: ({ label }: { label?: ReactNode }) => <span data-testid="spinner">{label}</span>,
    Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    Tooltip: ({ children, content }: { children?: ReactNode; content?: ReactNode }) => <div data-tooltip={content}>{children}</div>,
    makeStyles: () => () =>
      new Proxy(
        {},
        {
          get: (_target, property) => String(property),
        }
      ),
    tokens: new Proxy(
      {},
      {
        get: (_target, property) => String(property),
      }
    ),
  };
});

vi.mock('@fluentui/react-icons', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@fluentui/react-icons')>()),
  ArrowExport24Regular: () => <span />,
}));

vi.mock('@microsoft/designer-ui', async () => {
  const { ProgressStepper } = await import('../../../../../../../designer-ui/src/lib/progressstepper');
  return {
    ProgressStepper,
  };
});

vi.mock('../../../ReadOnlyWorkflowGraph', () => ({
  ReadOnlyWorkflowGraph: (props: { ariaLabel: string; graph: ReadOnlyWorkflowGraphData }) => {
    nativePreview.render(props);
    const { ariaLabel, graph } = props;
    return (
      <div role="img" aria-label={ariaLabel}>
        {graph.nodes.map(({ id, data }) => (
          <span key={id}>{data.label}</span>
        ))}
      </div>
    );
  },
}));

vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/logic-apps-shared')>();
  return {
    ...actual,
    guid: vi.fn(() => 'operation-id'),
  };
});

vi.mock('../../../../core/actions/bjsworkflow/serializer', () => ({
  serializeWorkflow: vi.fn(),
}));

vi.mock('../../../../core/actions/bjsworkflow/workflowExtraction', () => ({
  commitWorkflowExtraction: vi.fn(),
  getExtractionSelectedIds: vi.fn(),
  workflowExtractionFingerprint: vi.fn(),
}));

vi.mock('../../../../core/state/designerView/designerViewSlice', () => {
  const type = 'designerView/setWorkflowExtractionDialogOpen';
  const setWorkflowExtractionDialogOpen = Object.assign((payload: boolean) => ({ payload, type }), {
    match: (action: UnknownAction) => action.type === type,
    type,
  });
  return { setWorkflowExtractionDialogOpen };
});

vi.mock('../../../../core/state/workflow/workflowSlice', () => {
  const type = 'workflow/setFocusNode';
  const setFocusNode = Object.assign((payload: string) => ({ payload, type }), {
    match: (action: UnknownAction) => action.type === type,
    type,
  });
  return { setFocusNode };
});

vi.mock('../../../../core/utils/workflowExtraction', () => ({
  buildWorkflowExtractionPlan: vi.fn(),
}));

vi.mock('../workflowExtractionPreview', () => ({
  getWorkflowExtractionPreview: vi.fn(),
}));

const mockSerializeWorkflow = vi.mocked(serializeWorkflow);
const mockCommitWorkflowExtraction = vi.mocked(commitWorkflowExtraction);
const mockGetExtractionSelectedIds = vi.mocked(getExtractionSelectedIds);
const mockWorkflowExtractionFingerprint = vi.mocked(workflowExtractionFingerprint);
const mockBuildWorkflowExtractionPlan = vi.mocked(buildWorkflowExtractionPlan);
const mockGetWorkflowExtractionPreview = vi.mocked(getWorkflowExtractionPreview);

const serializedWorkflow: Workflow = {
  kind: 'Stateful',
  definition: {
    triggers: {
      Request: {
        type: 'Request',
        kind: 'Http',
        inputs: {},
      },
    },
    actions: {
      ActionA: {
        type: 'Compose',
        inputs: 'A',
        runAfter: {},
      },
      ActionB: {
        type: 'Compose',
        inputs: 'B',
        runAfter: {
          ActionA: ['Succeeded'],
        },
      },
    },
  },
};

const basePlan: WorkflowExtractionPlan = {
  source: serializedWorkflow,
  child: serializedWorkflow,
  childName: 'Suggested_workflow',
  selectedIds: ['ActionA', 'ActionB'],
  invocationId: 'Invoke_child',
  inputs: [],
  outputs: [],
};

const completedResult: WorkflowExtractionResult = {
  status: 'completed',
  child: {
    name: 'Suggested_workflow',
    href: '/workflows/Suggested_workflow',
  },
};

const createService = (overrides: Partial<WorkflowExtractionService> = {}): WorkflowExtractionService => ({
  hostingPlan: 'standard',
  persistenceDescription: 'The host will create and save both workflows.',
  sourceId: 'source-id',
  sourceName: 'Source workflow',
  createInvocation: vi.fn(() => ({
    type: 'Workflow',
    inputs: {},
    runAfter: {},
  })),
  validateName: vi.fn(() => undefined),
  getSuggestedName: vi.fn(() => Promise.resolve('Suggested_workflow')),
  commit: vi.fn(),
  ...overrides,
});

interface TestStateOptions {
  monitoring?: boolean;
  open?: boolean;
  readOnly?: boolean;
  selectedIds?: string[];
  workflow?: Workflow;
}

const createState = ({
  monitoring = false,
  open = false,
  readOnly = false,
  selectedIds = ['ActionA', 'ActionB'],
  workflow = serializedWorkflow,
}: TestStateOptions = {}) => {
  const deserialized = Deserialize(workflow.definition);
  return {
    designerOptions: {
      isMonitoringView: monitoring,
      readOnly,
    },
    designerView: {
      workflowExtractionDialogOpen: open,
    },
    operations: {
      operationMetadata: {
        ActionA: {
          brandColor: '#111111',
          iconUri: 'action-a.svg',
        },
        ActionB: {
          brandColor: '#222222',
          iconUri: 'action-b.svg',
        },
      },
    },
    panel: {
      operationContent: {
        selectedNodeIds: selectedIds,
      },
    },
    workflow: {
      graph: deserialized.graph,
      nodesMetadata: deserialized.nodesMetadata,
      operations: deserialized.actionData,
      focusedCanvasNodeId: undefined as string | undefined,
      idReplacements: {
        ActionA: 'RenamedActionA',
      },
    },
  };
};

const createTestStore = (options: TestStateOptions = {}) => {
  const initialState = createState(options);
  return configureStore({
    reducer: (state = initialState, action: UnknownAction) => {
      if (setWorkflowExtractionDialogOpen.match(action)) {
        return {
          ...state,
          designerView: {
            ...state.designerView,
            workflowExtractionDialogOpen: action.payload,
          },
        };
      }
      if (setFocusNode.match(action)) {
        return {
          ...state,
          workflow: {
            ...state.workflow,
            focusedCanvasNodeId: action.payload,
          },
        };
      }
      return state;
    },
  });
};

const renderWithProviders = (component: ReactNode, store: ReturnType<typeof createTestStore>, service?: WorkflowExtractionService) =>
  render(
    <Provider store={store}>
      <IntlProvider locale="en">
        <ProviderWrappedContext.Provider value={{ workflowExtractionService: service } as any}>{component}</ProviderWrappedContext.Provider>
      </IntlProvider>
    </Provider>
  );

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const renderPreparedDialog = async (service = createService()) => {
  const store = createTestStore({ open: true });
  const view = renderWithProviders(<WorkflowExtractionDialog />, store, service);
  await screen.findByDisplayValue('Suggested_workflow');
  return { service, store, ...view };
};

describe('WorkflowExtractionAction', () => {
  it.each([
    ['the service is unavailable', undefined, {}],
    ['the hosting plan is unsupported', createService({ hostingPlan: 'consumption' as 'standard' }), {}],
    ['the designer is read-only', createService(), { readOnly: true }],
    ['the designer is monitoring', createService(), { monitoring: true }],
    ['fewer than two actions are selected', createService(), { selectedIds: ['ActionA'] }],
  ])('does not render when %s', (_description, service, stateOptions) => {
    const store = createTestStore(stateOptions);
    renderWithProviders(<WorkflowExtractionAction />, store, service);

    expect(screen.queryByRole('button', { name: 'Extract to new workflow' })).not.toBeInTheDocument();
  });

  it('renders disabled with the selection requirement when the selected actions are not a contiguous chain', () => {
    const store = createTestStore({
      workflow: {
        ...serializedWorkflow,
        definition: {
          ...serializedWorkflow.definition,
          actions: {
            ...serializedWorkflow.definition.actions,
            ActionB: { ...serializedWorkflow.definition.actions.ActionB, runAfter: {} },
          },
        },
      },
    });
    renderWithProviders(<WorkflowExtractionAction />, store, createService());

    expect(screen.getByRole('button', { name: 'Extract to new workflow' })).toBeDisabled();
    expect(screen.getByText('Extract').parentElement).toHaveAttribute(
      'data-tooltip',
      'Select a connected, contiguous sequence of actions in the same workflow scope.'
    );
  });

  it('opens the dialog and invokes the caller callback for a valid button action', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const store = createTestStore();
    renderWithProviders(<WorkflowExtractionAction onClick={onClick} />, store, createService());

    await user.click(screen.getByRole('button', { name: 'Extract to new workflow' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(store.getState().designerView.workflowExtractionDialogOpen).toBe(true);
  });

  it('renders and opens from the menu-item variant', async () => {
    const user = userEvent.setup();
    const store = createTestStore();
    renderWithProviders(<WorkflowExtractionAction variant="menuItem" />, store, createService());

    await user.click(screen.getByRole('button', { name: 'Extract to new workflow' }));

    expect(store.getState().designerView.workflowExtractionDialogOpen).toBe(true);
  });

  it.each([
    { variant: 'button' as const, selectedIds: ['Condition', 'Then', 'Otherwise'] },
    { variant: 'menuItem' as const, selectedIds: ['Condition', 'Then', 'Otherwise'] },
    { variant: 'button' as const, selectedIds: ['Condition'] },
    { variant: 'menuItem' as const, selectedIds: ['Condition'] },
  ])(
    'enables a complete Condition selection from the $variant with real graph ancestry ($selectedIds)',
    async ({ variant, selectedIds }) => {
      const user = userEvent.setup();
      const workflow: Workflow = {
        ...serializedWorkflow,
        definition: {
          ...serializedWorkflow.definition,
          actions: {
            Condition: {
              type: 'If',
              expression: '@true',
              actions: { Then: { type: 'Compose', inputs: 'then', runAfter: {} } },
              else: { actions: { Otherwise: { type: 'Compose', inputs: 'else', runAfter: {} } } },
              runAfter: {},
            },
          },
        },
      };
      const store = createTestStore({ workflow, selectedIds });
      renderWithProviders(<WorkflowExtractionAction variant={variant} />, store, createService());
      expect(screen.getByRole('button', { name: 'Extract to new workflow' })).toBeEnabled();
      await user.click(screen.getByRole('button', { name: 'Extract to new workflow' }));
      expect(store.getState().designerView.workflowExtractionDialogOpen).toBe(true);
    }
  );

  it('disables incomplete expanded containers with a contextual coverage explanation', () => {
    const workflow: Workflow = {
      ...serializedWorkflow,
      definition: {
        ...serializedWorkflow.definition,
        actions: {
          Condition: {
            type: 'If',
            expression: '@true',
            actions: { Then: { type: 'Compose', inputs: 'then', runAfter: {} } },
            else: { actions: { Otherwise: { type: 'Compose', inputs: 'else', runAfter: {} } } },
            runAfter: {},
          },
        },
      },
    };
    const store = createTestStore({ workflow, selectedIds: ['Condition', 'Then'] });
    renderWithProviders(<WorkflowExtractionAction />, store, createService());
    expect(screen.getByRole('button', { name: 'Extract to new workflow' })).toBeDisabled();
    expect(screen.getByText('Extract').parentElement).toHaveAttribute(
      'data-tooltip',
      expect.stringContaining('Select every action inside "Condition"')
    );
  });
});

describe('WorkflowExtractionDialog', () => {
  it('previews and submits one normalized container, keeping its branch actions nested', async () => {
    const { buildWorkflowExtractionPlan: actualPlanner } = await vi.importActual<
      typeof import('../../../../core/utils/workflowExtraction')
    >('../../../../core/utils/workflowExtraction');
    const user = userEvent.setup();
    const workflow: Workflow = {
      ...serializedWorkflow,
      definition: {
        ...serializedWorkflow.definition,
        actions: {
          Condition: {
            type: 'If',
            expression: '@true',
            actions: { Then: { type: 'Compose', inputs: 'then', runAfter: {} } },
            else: { actions: { Otherwise: { type: 'Compose', inputs: 'else', runAfter: {} } } },
            runAfter: {},
          },
        },
      },
    };
    const store = createTestStore({ open: true, workflow, selectedIds: ['Otherwise', 'Condition', 'Then'] });
    mockSerializeWorkflow.mockResolvedValue(workflow);
    mockGetExtractionSelectedIds.mockImplementation((state) =>
      getWorkflowExtractionSelection(state.workflow, state.panel.operationContent.selectedNodeIds ?? [])
    );
    mockBuildWorkflowExtractionPlan.mockImplementation(actualPlanner);
    renderWithProviders(<WorkflowExtractionDialog />, store, createService());
    await screen.findByDisplayValue('Suggested_workflow');
    expect(mockBuildWorkflowExtractionPlan).toHaveBeenLastCalledWith(workflow, ['Condition'], 'Suggested_workflow', expect.any(Function));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    const submitted = mockCommitWorkflowExtraction.mock.calls[0][2].plan;
    expect(submitted.selectedIds).toEqual(['Condition']);
    expect(Object.keys(submitted.child.definition.actions)).toEqual(['Condition', 'Response']);
    expect(submitted.child.definition.actions.Condition).toEqual(workflow.definition.actions.Condition);
    expect(submitted.source.definition.actions.Condition).toBeUndefined();
    expect(submitted.source.definition.actions.Then).toBeUndefined();
  });

  it('shows the actual planner restriction after structural validation, not an invalid-selection message', async () => {
    const { buildWorkflowExtractionPlan: actualPlanner } = await vi.importActual<
      typeof import('../../../../core/utils/workflowExtraction')
    >('../../../../core/utils/workflowExtraction');
    const workflow: Workflow = {
      ...serializedWorkflow,
      definition: {
        ...serializedWorkflow.definition,
        actions: {
          Condition: {
            type: 'If',
            expression: '@true',
            actions: { Stop: { type: 'Terminate', inputs: { runStatus: 'Succeeded' }, runAfter: {} } },
            else: { actions: {} },
            runAfter: {},
          },
        },
      },
    };
    const store = createTestStore({ open: true, workflow, selectedIds: ['Condition', 'Stop'] });
    mockSerializeWorkflow.mockResolvedValue(workflow);
    mockGetExtractionSelectedIds.mockImplementation((state) =>
      getWorkflowExtractionSelection(state.workflow, state.panel.operationContent.selectedNodeIds ?? [])
    );
    mockBuildWorkflowExtractionPlan.mockImplementation(actualPlanner);
    renderWithProviders(<WorkflowExtractionDialog />, store, createService());
    expect(await screen.findByText(/Action "Stop" responds to or terminates the original workflow/)).toBeInTheDocument();
    expect(screen.queryByText(/Select at least two distinct actions/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(mockCommitWorkflowExtraction).not.toHaveBeenCalled();
  });

  it('does not prepare or render while closed', () => {
    const store = createTestStore();
    renderWithProviders(<WorkflowExtractionDialog />, store, createService());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockSerializeWorkflow).not.toHaveBeenCalled();
  });

  it('closes through the dialog open-change callback while idle', async () => {
    const user = userEvent.setup();
    const { store } = await renderPreparedDialog();

    await user.click(screen.getByRole('button', { name: 'Dismiss dialog' }));

    expect(store.getState().designerView.workflowExtractionDialogOpen).toBe(false);
  });

  it('waits for serialization and the async suggested name before building the preview', async () => {
    const serialization = createDeferred<Workflow>();
    const suggestion = createDeferred<string>();
    const service = createService({
      getSuggestedName: vi.fn(() => suggestion.promise),
    });
    const plan: WorkflowExtractionPlan = {
      ...basePlan,
      inputs: [
        {
          expression: "@actions('Before')",
          name: 'input',
          rewrittenExpression: "@triggerBody()?['input']",
          schema: {
            type: 'string',
          },
        },
      ],
      outputs: [
        {
          expression: "@body('ActionB')",
          name: 'output',
          rewrittenExpression: "@body('Invoke_child')?['output']",
          schema: {
            type: 'string',
          },
        },
      ],
    };
    mockSerializeWorkflow.mockReturnValue(serialization.promise);
    mockBuildWorkflowExtractionPlan.mockReturnValue(plan);
    const store = createTestStore({ open: true });
    renderWithProviders(<WorkflowExtractionDialog />, store, service);

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();

    await act(async () => {
      serialization.resolve(serializedWorkflow);
      await serialization.promise;
    });

    expect(service.getSuggestedName).toHaveBeenCalledWith('Extracted_workflow');
    expect(screen.getByTestId('spinner')).toBeInTheDocument();

    await act(async () => {
      suggestion.resolve('Suggested_workflow');
      await suggestion.promise;
    });

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Workflow name' })).toHaveValue('Suggested_workflow'));
    expect(mockBuildWorkflowExtractionPlan).toHaveBeenCalledWith(
      serializedWorkflow,
      ['ActionA', 'ActionB'],
      'Suggested_workflow',
      service.createInvocation
    );
    expect(mockGetWorkflowExtractionPreview).toHaveBeenCalledWith(plan, {
      ActionB: {
        brandColor: '#222222',
        iconUri: 'action-b.svg',
      },
      RenamedActionA: {
        brandColor: '#111111',
        iconUri: 'action-a.svg',
      },
    });
    expect(screen.getByRole('img', { name: 'Child workflow preview' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Inputs' })).toHaveTextContent("@triggerBody()?['input']");
    expect(screen.getByRole('region', { name: 'Outputs' })).toHaveTextContent("@body('Invoke_child')?['output']");
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('surfaces serialization and preview preparation failures without enabling confirmation', async () => {
    mockSerializeWorkflow.mockRejectedValueOnce(new Error('Serialization failed'));
    const firstStore = createTestStore({ open: true });
    const firstView = renderWithProviders(<WorkflowExtractionDialog />, firstStore, createService());

    expect(await screen.findByText('Serialization failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();

    firstView.unmount();
    mockSerializeWorkflow.mockResolvedValueOnce(serializedWorkflow);
    mockBuildWorkflowExtractionPlan.mockImplementationOnce(() => {
      throw new Error('Preview failed');
    });
    const secondStore = createTestStore({ open: true });
    renderWithProviders(<WorkflowExtractionDialog />, secondStore, createService());

    expect(await screen.findByText('Preview failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    cleanup();
    mockBuildWorkflowExtractionPlan.mockReturnValue(basePlan);
    mockGetWorkflowExtractionPreview.mockRejectedValueOnce(new Error('Layout failed'));
    renderWithProviders(<WorkflowExtractionDialog />, createTestStore({ open: true }), createService());
    expect(await screen.findByText('The child workflow preview could not be rendered: Layout failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('ignores stale asynchronous layouts after a definition update and preserves the live editor on cancel', async () => {
    const first = createDeferred<Awaited<ReturnType<typeof getWorkflowExtractionPreview>>>();
    const latest = createDeferred<Awaited<ReturnType<typeof getWorkflowExtractionPreview>>>();
    mockGetWorkflowExtractionPreview.mockImplementation((plan) =>
      plan.childName === 'Suggested_workflow' ? first.promise : latest.promise
    );
    const { store } = await renderPreparedDialog();
    const before = store.getState();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Workflow name' }), { target: { value: 'Updated_workflow' } });
    await act(async () => {
      latest.resolve({ nodes: [{ id: 'latest', data: { label: 'Latest nested graph' }, position: { x: 0, y: 0 } }], edges: [] });
      await latest.promise;
    });
    expect(screen.getByText('Latest nested graph')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    await act(async () => {
      first.resolve({ nodes: [{ id: 'stale', data: { label: 'Stale nested graph' }, position: { x: 0, y: 0 } }], edges: [] });
      await first.promise;
    });
    expect(screen.queryByText('Stale nested graph')).not.toBeInTheDocument();
    expect(screen.getByText('Latest nested graph')).toBeInTheDocument();
    expect(store.getState()).toBe(before);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(store.getState().workflow).toBe(before.workflow);
    expect(store.getState().operations).toBe(before.operations);
    expect(mockCommitWorkflowExtraction).not.toHaveBeenCalled();
  });

  it('blocks confirmation during native-size layout and surfaces its failure without invoking extraction', async () => {
    await renderPreparedDialog();
    const onLayoutStateChange = nativePreview.render.mock.lastCall![0].onLayoutStateChange;
    await act(async () => onLayoutStateChange({ loading: true }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await act(async () => onLayoutStateChange({ loading: false, error: new Error('Native layout failed') }));
    expect(screen.getByText('The child workflow preview could not be rendered: Native layout failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(mockCommitWorkflowExtraction).not.toHaveBeenCalled();
  });

  it('discards a pending layout after unmount without changing the original editor or invoking extraction', async () => {
    const layout = createDeferred<Awaited<ReturnType<typeof getWorkflowExtractionPreview>>>();
    mockGetWorkflowExtractionPreview.mockReturnValue(layout.promise);
    const { store, unmount } = await renderPreparedDialog();
    const before = store.getState();
    unmount();
    await act(async () => {
      layout.resolve({ nodes: [{ id: 'late', data: { label: 'Late graph' }, position: { x: 0, y: 0 } }], edges: [] });
      await layout.promise;
    });
    expect(screen.queryByText('Late graph')).not.toBeInTheDocument();
    expect(store.getState()).toBe(before);
    expect(mockCommitWorkflowExtraction).not.toHaveBeenCalled();
  });

  it('validates edited names and disables confirmation for invalid input', async () => {
    const user = userEvent.setup();
    const service = createService({
      validateName: vi.fn((name) => (name === 'Taken' ? 'A workflow with this name already exists.' : undefined)),
    });
    await renderPreparedDialog(service);
    const input = screen.getByRole('textbox', { name: 'Workflow name' });

    await user.clear(input);
    await user.type(input, 'Taken');

    expect(screen.getByRole('alert')).toHaveTextContent('A workflow with this name already exists.');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('retains numbered checkpoint statuses, blocks navigation, and focuses the invocation only after completion', async () => {
    const user = userEvent.setup();
    const preparing = createDeferred<void>();
    const saving = createDeferred<void>();
    const refreshing = createDeferred<void>();
    mockCommitWorkflowExtraction.mockImplementation(async (_store, _service, _request, setStage, onProgress) => {
      await preparing.promise;
      onProgress?.({ step: 'preparing', status: 'completed' });
      setStage('saving');
      onProgress?.({ step: 'validating-child', status: 'in-progress' });
      onProgress?.({ step: 'validating-child', status: 'completed' });
      onProgress?.({ step: 'creating-child', status: 'in-progress' });
      await saving.promise;
      onProgress?.({ step: 'creating-child', status: 'completed' });
      onProgress?.({ step: 'saving-source', status: 'in-progress' });
      onProgress?.({ step: 'saving-source', status: 'completed' });
      setStage('refreshing');
      onProgress?.({ step: 'applying-source', status: 'in-progress' });
      await refreshing.promise;
      return completedResult;
    });
    const { store } = await renderPreparedDialog();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    const list = screen.getByRole('list', { name: 'Extraction progress' });
    expect(list.tagName).toBe('OL');
    const steps = within(list).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('Prepare workflows');
    expect(steps[0]).toHaveTextContent('In progress');
    expect(steps[1]).toHaveTextContent('Create child workflow');
    expect(steps[2]).toHaveTextContent('Update parent workflow');
    expect(within(list).queryByText(/Pending|Not started|Not confirmed/)).not.toBeInTheDocument();
    expect(steps[0]).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    const beforeUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    await act(async () => {
      preparing.resolve();
      await preparing.promise;
    });
    expect(steps[0]).toHaveTextContent('Completed');
    expect(steps[1]).toHaveTextContent('In progress');
    expect(steps[2]).not.toHaveTextContent('In progress');

    await act(async () => {
      saving.resolve();
      await saving.promise;
    });
    expect(steps[1]).toHaveTextContent('Completed');
    expect(steps[2]).toHaveTextContent('In progress');

    await act(async () => {
      refreshing.resolve();
      await refreshing.promise;
    });
    expect(await screen.findByText('The child workflow was created and the source workflow was saved.')).toBeInTheDocument();
    expect(mockCommitWorkflowExtraction).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        operationId: 'operation-id',
        plan: expect.objectContaining({
          invocationId: 'Invoke_child',
        }),
        sourceFingerprint: 'workflow-fingerprint',
      }),
      expect.any(Function),
      expect.any(Function)
    );
    expect(within(list).getAllByText('Completed')).toHaveLength(3);
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    const openChild = screen.getByRole('link', { name: 'Open child workflow' });
    expect(openChild.tagName).toBe('A');
    expect(openChild).toHaveAttribute('href', '/workflows/Suggested_workflow');
    expect(openChild).toHaveAttribute('target', '_blank');
    expect(openChild).toHaveAttribute('rel', 'noopener noreferrer');
    expect(openChild).toHaveAccessibleDescription('Opens in a new tab');
    const closeButton = screen.getByRole('button', { name: 'Close' });
    const success = screen.getByText('The child workflow was created and the source workflow was saved.');
    expect(screen.getAllByText(success.textContent!)).toHaveLength(1);
    expect(list.compareDocumentPosition(success) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(success.compareDocumentPosition(openChild) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(openChild.nextElementSibling).toBe(closeButton);
    expect(openChild.parentElement).toBe(closeButton.parentElement);
    const activate = vi.fn((event: Event) => event.preventDefault());
    openChild.addEventListener('click', activate);
    openChild.focus();
    expect(openChild).toHaveFocus();
    await user.keyboard(' ');
    expect(activate).toHaveBeenCalledOnce();
    await user.keyboard('{Enter}');
    expect(activate).toHaveBeenCalledTimes(2);
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(store.getState().designerView.workflowExtractionDialogOpen).toBe(false);
    expect(store.getState().workflow.focusedCanvasNodeId).toBe('Invoke_child');
  });

  it('retries a child-created result with the same idempotent request', async () => {
    const user = userEvent.setup();
    const partialResult: WorkflowExtractionResult = {
      status: 'child-created',
      child: completedResult.child,
      message: 'The child was created, but the source update failed.',
    };
    mockCommitWorkflowExtraction.mockResolvedValueOnce(partialResult).mockResolvedValueOnce(completedResult);
    await renderPreparedDialog();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getAllByText(partialResult.message)).toHaveLength(2));
    expect(screen.getByRole('link', { name: 'Open child workflow' })).toHaveAttribute('href', '/workflows/Suggested_workflow');
    const childLink = screen.getByRole('link', { name: 'Open child workflow' });
    expect(childLink.nextElementSibling).toBe(screen.getByRole('button', { name: 'Retry source update' }));
    expect(childLink).toHaveAccessibleDescription('Opens in a new tab');
    const steps = within(screen.getByRole('list', { name: 'Extraction progress' })).getAllByRole('listitem');
    expect(steps[1]).toHaveTextContent(partialResult.message);
    expect(steps[2]).not.toHaveTextContent('Completed');
    const firstRequest = mockCommitWorkflowExtraction.mock.calls[0][2];

    await user.click(screen.getByRole('button', { name: 'Retry source update' }));

    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(mockCommitWorkflowExtraction).toHaveBeenCalledTimes(2);
    expect(mockCommitWorkflowExtraction.mock.calls[1][2]).toBe(firstRequest);
  });

  it('treats source-saved results as terminal and closes without focusing the invocation', async () => {
    const user = userEvent.setup();
    const result: WorkflowExtractionResult = {
      status: 'source-saved',
      child: completedResult.child,
      message: 'Both workflows were saved, but the designer could not refresh.',
    };
    mockCommitWorkflowExtraction.mockResolvedValue(result);
    const { store } = await renderPreparedDialog();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getAllByText(result.message)).toHaveLength(3));
    expect(screen.queryByText('The child workflow was created and the source workflow was saved.')).not.toBeInTheDocument();
    const steps = within(screen.getByRole('list', { name: 'Extraction progress' })).getAllByRole('listitem');
    expect(steps[1]).toHaveTextContent(result.message);
    expect(steps[2]).toHaveTextContent(result.message);
    expect(steps[2]).not.toHaveTextContent('Completed');
    expect(screen.queryByRole('button', { name: 'Retry source update' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open child workflow' }).nextElementSibling).toBe(
      screen.getByRole('button', { name: 'Close' })
    );

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(store.getState().designerView.workflowExtractionDialogOpen).toBe(false);
    expect(store.getState().workflow.focusedCanvasNodeId).toBeUndefined();
  });

  it('surfaces commit failures and allows confirmation to be retried', async () => {
    const user = userEvent.setup();
    mockCommitWorkflowExtraction.mockRejectedValueOnce(new Error('Source write failed')).mockResolvedValueOnce(completedResult);
    await renderPreparedDialog();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Source write failed')).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')[0]).toHaveTextContent('Source write failed');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(mockCommitWorkflowExtraction).toHaveBeenCalledTimes(2);
  });

  it.each([new Error(), '', ' \n ', undefined, null])(
    'keeps recovery controls and a contextual fallback for empty rejection %s',
    async (cause) => {
      const user = userEvent.setup();
      mockCommitWorkflowExtraction.mockRejectedValueOnce(cause).mockResolvedValueOnce(completedResult);
      await renderPreparedDialog();
      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(await screen.findByText('Extraction could not be completed. Review both workflows before continuing.')).toBeInTheDocument();
      expect(within(screen.getByRole('list')).getAllByRole('listitem')[0]).toHaveTextContent('Error');
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
      await user.click(screen.getByRole('button', { name: 'Confirm' }));
      expect(await screen.findByRole('button', { name: 'Close' })).toBeEnabled();
    }
  );

  it.each([
    ['child-created', ''],
    ['child-created', ' \n '],
    ['source-saved', ''],
    ['source-saved', ' \n '],
  ] as const)('keeps %s recovery semantics for an empty partial message %s', async (status, message) => {
    const user = userEvent.setup();
    mockCommitWorkflowExtraction.mockResolvedValue({ status, message, child: completedResult.child });
    await renderPreparedDialog();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    await within(steps[1]).findByText('Extraction could not be completed. Review both workflows before continuing.');
    expect(steps[1]).toHaveTextContent('Error');
    expect(steps[1]).not.toHaveTextContent('Completed');
    expect(screen.getByRole('link', { name: 'Open child workflow' })).toBeInTheDocument();
    expect(screen.queryByText('The child workflow was created and the source workflow was saved.')).not.toBeInTheDocument();
    if (status === 'source-saved') {
      expect(steps[2]).toHaveTextContent('Error');
      expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Retry source update' })).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('button', { name: 'Retry source update' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    }
  });

  it('keeps long unconfirmed saved-source recovery in a focusable progress region with Close outside it', async () => {
    const user = userEvent.setup();
    const message = 'Both workflows were saved; child readiness is unknown. Reload and review before editing. '.repeat(30);
    mockCommitWorkflowExtraction.mockResolvedValue({ status: 'source-saved', child: completedResult.child, message });
    await renderPreparedDialog();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    const region = screen.getByRole('region', { name: 'Extraction progress details' });
    expect(region).toHaveAttribute('tabindex', '0');
    await waitFor(() => expect(within(region).getAllByText(message.trim())).toHaveLength(3));
    const close = screen.getByRole('button', { name: 'Close' });
    expect(within(region).queryByRole('button')).not.toBeInTheDocument();
    expect(within(region).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open child workflow' }).nextElementSibling).toBe(close);
    expect(region.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(close).toBeEnabled();
  });

  it('places three neutral noninteractive milestones after all bindings and before confirmation without a generic warning', async () => {
    mockBuildWorkflowExtractionPlan.mockReturnValue({
      ...basePlan,
      inputs: [
        { expression: "@actions('Before')", name: 'input', rewrittenExpression: "@triggerBody()?['input']", schema: { type: 'string' } },
      ],
      outputs: [
        {
          expression: "@body('ActionB')",
          name: 'output',
          rewrittenExpression: "@body('Invoke_child')?['output']",
          schema: { type: 'string' },
        },
      ],
    });
    await renderPreparedDialog();
    const list = screen.getByRole('list', { name: 'Extraction progress' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Prepare workflows');
    expect(items[1]).toHaveTextContent('Create child workflow');
    expect(items[2]).toHaveTextContent('Update parent workflow');
    expect(list.querySelector('[aria-current]')).toBeNull();
    expect(within(list).queryByText(/Pending|Not started|In progress|Completed|Failed/)).not.toBeInTheDocument();
    expect(within(list).queryByRole('button')).not.toBeInTheDocument();
    expect(within(list).queryByRole('link')).not.toBeInTheDocument();
    for (const table of screen.getAllByRole('table')) {
      expect(table.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(list.compareDocumentPosition(screen.getByRole('button', { name: 'Confirm' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      screen.queryByText('The child can remain published if updating the source fails. Undo does not delete the child.')
    ).not.toBeInTheDocument();
  });

  it('keeps parent update active through finalization and shows a cleanup failure locally rather than success', async () => {
    const user = userEvent.setup();
    const finalization = createDeferred<void>();
    mockCommitWorkflowExtraction.mockImplementationOnce(async (_store, _service, _request, _setStage, notify) => {
      notify?.({ step: 'preparing', status: 'completed' });
      notify?.({ step: 'validating-child', status: 'completed' });
      notify?.({ step: 'creating-child', status: 'completed' });
      notify?.({ step: 'saving-source', status: 'completed' });
      notify?.({ step: 'applying-source', status: 'completed' });
      await finalization.promise;
      return { status: 'source-saved', child: completedResult.child, message: 'Both workflows were saved. Cleanup failed; reload.' };
    });
    await renderPreparedDialog();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    const steps = within(screen.getByRole('list', { name: 'Extraction progress' })).getAllByRole('listitem');
    expect(steps[0]).toHaveTextContent('Completed');
    expect(steps[1]).toHaveTextContent('Completed');
    expect(steps[2]).toHaveTextContent('In progress');
    expect(steps[2]).not.toHaveTextContent('Completed');
    await act(async () => finalization.resolve());
    expect(await within(steps[2]).findByText('Both workflows were saved. Cleanup failed; reload.')).toBeInTheDocument();
    expect(steps[2]).not.toHaveTextContent('Completed');
    expect(screen.queryByText('The child workflow was created and the source workflow was saved.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
  });

  it('retains confirmed child readiness on source failure, resets failures on retry, and resets the checklist on reopen', async () => {
    const user = userEvent.setup();
    const retry = createDeferred<WorkflowExtractionResult>();
    mockCommitWorkflowExtraction
      .mockImplementationOnce(async (_store, _service, _request, _setStage, notify) => {
        notify?.({ step: 'preparing', status: 'completed' });
        notify?.({ step: 'validating-child', status: 'completed' });
        notify?.({ step: 'creating-child', status: 'completed' });
        notify?.({ step: 'saving-source', status: 'in-progress' });
        return { status: 'child-created', child: completedResult.child, message: 'Source conflict: review before retrying.' };
      })
      .mockImplementationOnce(() => retry.promise);
    const { store } = await renderPreparedDialog();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await screen.findByText('Source conflict: review before retrying.');
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps[1]).toHaveTextContent('Completed');
    expect(steps[2]).toHaveTextContent('Source conflict: review before retrying.');

    await user.click(screen.getByRole('button', { name: 'Retry source update' }));
    expect(steps[0]).toHaveTextContent('In progress');
    expect(steps[1]).toHaveTextContent('Completed');
    expect(steps[2]).not.toHaveTextContent('Source conflict');
    const retainedChildLink = screen.getByRole('link', { name: 'Open child workflow' });
    expect(retainedChildLink).toHaveAttribute('href', '/workflows/Suggested_workflow');
    expect(retainedChildLink.nextElementSibling).toBe(screen.getByRole('button', { name: 'Retry source update' }));
    expect(screen.getByRole('button', { name: 'Retry source update' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await act(async () => retry.resolve(completedResult));
    await user.click(await screen.findByRole('button', { name: 'Close' }));
    act(() => store.dispatch(setWorkflowExtractionDialogOpen(true)));
    await screen.findByDisplayValue('Suggested_workflow');
    expect(within(screen.getByRole('list', { name: 'Extraction progress' })).queryByText('Completed')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open child workflow' })).not.toBeInTheDocument();
  });

  it('clears the open state when the extraction service is lost so the designer is not left read-only', async () => {
    const service = createService();
    const store = createTestStore({ open: true });
    const view = renderWithProviders(<WorkflowExtractionDialog />, store, service);
    await screen.findByDisplayValue('Suggested_workflow');

    view.rerender(
      <Provider store={store}>
        <IntlProvider locale="en">
          <ProviderWrappedContext.Provider value={{} as any}>
            <WorkflowExtractionDialog />
          </ProviderWrappedContext.Provider>
        </IntlProvider>
      </Provider>
    );

    await waitFor(() => expect(store.getState().designerView.workflowExtractionDialogOpen).toBe(false));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

beforeEach(() => {
  InitLoggerService([]);
  mockSerializeWorkflow.mockReset();
  mockCommitWorkflowExtraction.mockReset();
  mockGetExtractionSelectedIds.mockReset();
  mockWorkflowExtractionFingerprint.mockReset();
  mockBuildWorkflowExtractionPlan.mockReset();
  mockGetWorkflowExtractionPreview.mockReset();
  mockSerializeWorkflow.mockResolvedValue(serializedWorkflow);
  mockCommitWorkflowExtraction.mockResolvedValue(completedResult);
  mockGetExtractionSelectedIds.mockReturnValue(['ActionA', 'ActionB']);
  mockWorkflowExtractionFingerprint.mockReturnValue('workflow-fingerprint');
  mockBuildWorkflowExtractionPlan.mockImplementation((_workflow, _ids, name) => ({
    ...basePlan,
    childName: name,
  }));
  mockGetWorkflowExtractionPreview.mockResolvedValue({
    edges: [],
    nodes: [],
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
