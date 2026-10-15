/**
 * @vitest-environment jsdom
 */
import { configureStore, type UnknownAction } from '@reduxjs/toolkit';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
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
import { getOrderedSelectedChain, getTopLevelSelectedNodes } from '../../../../core/utils/multiselect';
import { buildWorkflowExtractionPlan } from '../../../../core/utils/workflowExtraction';
import { WorkflowExtractionAction, WorkflowExtractionDialog } from '../workflowExtraction';
import { getWorkflowExtractionPreview } from '../workflowExtractionPreview';

vi.mock('@fluentui/react-components', () => {
  const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    Accordion: passthrough,
    AccordionHeader: passthrough,
    AccordionItem: passthrough,
    AccordionPanel: passthrough,
    Button: ({
      appearance: _appearance,
      children,
      icon: _icon,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { appearance?: string; icon?: ReactNode }) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
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

vi.mock('@fluentui/react-icons', () => ({
  ArrowExport24Regular: () => <span />,
}));

vi.mock('@microsoft/designer-ui', () => ({
  WorkflowPreview: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
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

vi.mock('../../../../core/utils/multiselect', () => ({
  getOrderedSelectedChain: vi.fn(),
  getTopLevelSelectedNodes: vi.fn(),
}));

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
const mockGetOrderedSelectedChain = vi.mocked(getOrderedSelectedChain);
const mockGetTopLevelSelectedNodes = vi.mocked(getTopLevelSelectedNodes);
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
}

const createState = ({
  monitoring = false,
  open = false,
  readOnly = false,
  selectedIds = ['ActionA', 'ActionB'],
}: TestStateOptions = {}) => ({
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
    focusedCanvasNodeId: undefined as string | undefined,
    idReplacements: {
      ActionA: 'RenamedActionA',
    },
  },
});

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
    mockGetOrderedSelectedChain.mockReturnValue(undefined);
    const store = createTestStore();
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
    expect(mockGetTopLevelSelectedNodes).toHaveBeenCalledWith(store.getState().workflow, ['ActionA', 'ActionB']);
  });

  it('renders and opens from the menu-item variant', async () => {
    const user = userEvent.setup();
    const store = createTestStore();
    renderWithProviders(<WorkflowExtractionAction variant="menuItem" />, store, createService());

    await user.click(screen.getByRole('button', { name: 'Extract to new workflow' }));

    expect(store.getState().designerView.workflowExtractionDialogOpen).toBe(true);
  });
});

describe('WorkflowExtractionDialog', () => {
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

  it('shows each busy stage, blocks navigation, and focuses the invocation after a completed extraction closes', async () => {
    const user = userEvent.setup();
    const preparing = createDeferred<void>();
    const saving = createDeferred<void>();
    const refreshing = createDeferred<void>();
    mockCommitWorkflowExtraction.mockImplementation(async (_store, _service, _request, setStage) => {
      await preparing.promise;
      setStage('saving');
      await saving.promise;
      setStage('refreshing');
      await refreshing.promise;
      return completedResult;
    });
    const { store } = await renderPreparedDialog();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByText('Preparing workflows...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    const beforeUnload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(beforeUnload);
    expect(beforeUnload.defaultPrevented).toBe(true);

    await act(async () => {
      preparing.resolve();
      await preparing.promise;
    });
    expect(await screen.findByText('Creating child and saving source...')).toBeInTheDocument();

    await act(async () => {
      saving.resolve();
      await saving.promise;
    });
    expect(await screen.findByText('Refreshing designer...')).toBeInTheDocument();

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
      expect.any(Function)
    );

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

    expect(await screen.findByText(partialResult.message)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Suggested_workflow' })).toHaveAttribute('href', '/workflows/Suggested_workflow');
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

    expect(await screen.findByText(result.message)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry source update' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

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
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(mockCommitWorkflowExtraction).toHaveBeenCalledTimes(2);
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
  mockSerializeWorkflow.mockReset();
  mockCommitWorkflowExtraction.mockReset();
  mockGetExtractionSelectedIds.mockReset();
  mockWorkflowExtractionFingerprint.mockReset();
  mockGetTopLevelSelectedNodes.mockReset();
  mockGetOrderedSelectedChain.mockReset();
  mockBuildWorkflowExtractionPlan.mockReset();
  mockGetWorkflowExtractionPreview.mockReset();
  mockSerializeWorkflow.mockResolvedValue(serializedWorkflow);
  mockCommitWorkflowExtraction.mockResolvedValue(completedResult);
  mockGetExtractionSelectedIds.mockReturnValue(['ActionA', 'ActionB']);
  mockWorkflowExtractionFingerprint.mockReturnValue('workflow-fingerprint');
  mockGetTopLevelSelectedNodes.mockReturnValue(['ActionA', 'ActionB']);
  mockGetOrderedSelectedChain.mockReturnValue(['ActionA', 'ActionB']);
  mockBuildWorkflowExtractionPlan.mockImplementation((_workflow, _ids, name) => ({
    ...basePlan,
    childName: name,
  }));
  mockGetWorkflowExtractionPreview.mockReturnValue({
    edges: [],
    nodes: [],
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
