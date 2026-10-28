// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RefetchOptions } from '@tanstack/react-query';
import { configureStore, createReducer } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { Component } from 'react';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import type { Workflow as DesignerWorkflow } from '@microsoft/logic-apps-designer-v2';
import type { VFSObject } from '@microsoft/logic-apps-shared';
import type { DesignerCommandBar } from '../DesignerCommandBarV2';
import type {
  ConnectionAndAppSetting,
  ConnectionsData,
  NotesData,
  ParametersData,
  Workflow as ArtifactResource,
  WorkflowJson,
} from '../Models/Workflow';
import { Artifact, VfsArtifact } from '../Models/Workflow';
import type { saveWorkflowStandard } from '../Services/WorkflowAndArtifacts';
import { changeRunId, setMonitoringView, setReadOnly, setRunHistoryEnabled } from '../../../state/workflowLoadingSlice';
import DesignerEditor from '../laDesignerV2';

type CustomCodeData = {
  // VFS JSON responses contain parsed JSON, including the draft definition and notes.
  files: Record<string, WorkflowJson | NotesData>;
  metadata: Record<string, VFSObject>;
};
type CommandBarProps = Pick<
  ComponentProps<typeof DesignerCommandBar>,
  'saveWorkflow' | 'showMonitoringView' | 'showDesignerView' | 'showCodeView' | 'isCodeView' | 'isReadOnly' | 'isMonitoringView'
>;
type ConnectionServiceOptions = {
  readConnections: () => ConnectionsData;
  writeConnection: (connection: ConnectionAndAppSetting) => Promise<void>;
};
type DesignerOptions = {
  readOnly: boolean;
  isMonitoringView: boolean;
  services: { connectionService: { options: ConnectionServiceOptions } };
};
type DesignerSnapshot = { workflow: DesignerWorkflow; readOnly: boolean; monitoring: boolean };

const mocks = vi.hoisted(() => ({
  loadArtifacts: vi.fn<() => Promise<ArtifactResource>>(),
  loadCustomCode: vi.fn<() => Promise<CustomCodeData>>(),
  customCodeRefetch: vi.fn<(options?: RefetchOptions) => void>(),
  artifactsRefetch: vi.fn<(options?: RefetchOptions) => void>(),
  save: vi.fn<typeof saveWorkflowStandard>(),
  deploy: vi.fn(),
  queryClient: undefined as QueryClient | undefined,
  options: undefined as DesignerOptions | undefined,
  commandBar: undefined as CommandBarProps | undefined,
  workflow: undefined as DesignerWorkflow | undefined,
  snapshots: [] as DesignerSnapshot[],
  settings: { properties: {} as Record<string, string> },
  workflowApp: { location: 'West US', properties: {}, identity: { principalId: 'app-identity' } },
  runDefinition: undefined as DesignerWorkflow['definition'] | undefined,
}));

// Exercise real React Query loading/refetch behavior, with independently controlled service responses.
vi.mock('../Services/WorkflowAndArtifacts', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  const { useCallback } = await import('react');
  return {
    useAllCustomCodeFilesWithMetadata: (appId?: string, workflowName?: string) => {
      const query = useQuery(['customCode', appId, workflowName], mocks.loadCustomCode);
      const refetch = useCallback(
        (options?: RefetchOptions) => {
          mocks.customCodeRefetch(options);
          return query.refetch(options);
        },
        [query.refetch]
      );
      return { ...query, refetch };
    },
    useWorkflowAndArtifactsStandard: (workflowId: string) => {
      const query = useQuery(['artifacts', workflowId], mocks.loadArtifacts);
      const refetch = useCallback(
        (options?: RefetchOptions) => {
          mocks.artifactsRefetch(options);
          return query.refetch(options);
        },
        [query.refetch]
      );
      return { ...query, refetch };
    },
    useAppSettings: () => ({ data: mocks.settings, isLoading: false }),
    useWorkflowApp: () => ({ data: mocks.workflowApp, isLoading: false }),
    useCurrentTenantId: () => ({ data: 'tenant' }),
    useCurrentObjectId: () => ({ data: 'object' }),
    saveWorkflowStandard: mocks.save,
    deployArtifacts: mocks.deploy,
    getCustomCodeAppFiles: vi.fn(),
    getConnectionStandard: vi.fn(),
    createOrUpdateConnection: vi.fn(),
    listCallbackUrl: vi.fn(),
    fetchAgentUrl: vi.fn(),
    validateWorkflowStandard: vi.fn(),
    uploadFileToKnowledgeHub: vi.fn(),
  };
});

vi.mock('../../../state/workflowLoadingSlice', async () => {
  const { createAction } = await import('@reduxjs/toolkit');
  return {
    changeRunId: createAction<string | undefined>('workflowLoader/changeRunId'),
    setMonitoringView: createAction<boolean>('workflowLoader/setMonitoringView'),
    setReadOnly: createAction<boolean>('workflowLoader/setReadOnly'),
    setRunHistoryEnabled: createAction<boolean>('workflowLoader/setRunHistoryEnabled'),
    setIsChatBotEnabled: createAction<boolean>('workflowLoader/setIsChatBotEnabled'),
  };
});

vi.mock('@microsoft/logic-apps-designer-v2', async () => {
  const { useLayoutEffect, useMemo } = await import('react');
  return {
    DesignerProvider: ({ children, options }: PropsWithChildren<{ options: DesignerOptions }>) => {
      mocks.options = options;
      return <>{children}</>;
    },
    BJSWorkflowProvider: ({ children, workflow }: PropsWithChildren<{ workflow: DesignerWorkflow }>) => {
      const readOnly = mocks.options?.readOnly ?? false;
      const monitoring = mocks.options?.isMonitoringView ?? false;
      // Record committed UI states, not render attempts React may discard.
      useLayoutEffect(() => {
        mocks.workflow = structuredClone(workflow);
        mocks.snapshots.push({ workflow: structuredClone(workflow), readOnly, monitoring });
      }, [workflow, readOnly, monitoring]);
      return <>{children}</>;
    },
    Designer: () => null,
    CombineInitializeVariableDialog: () => null,
    TriggerDescriptionDialog: () => null,
    getReactQueryClient: () => mocks.queryClient,
    getSKUDefaultHostOptions: () => ({}),
    Constants: { SKU: { STANDARD: 'standard' } },
    useRun: (runId?: string) => ({
      // Real query data is referentially stable between unchanged renders.
      data: useMemo(
        () => (runId ? { properties: { workflow: { properties: { definition: mocks.runDefinition } } } } : undefined),
        [runId, mocks.runDefinition]
      ),
    }),
  };
});

vi.mock('../DesignerCommandBarV2', () => ({
  DesignerCommandBar: (props: CommandBarProps) => {
    mocks.commandBar = props;
    return (
      <div
        data-testid="command-bar"
        data-readonly={String(props.isReadOnly)}
        data-monitoring={String(props.isMonitoringView)}
        data-codeview={String(props.isCodeView)}
      />
    );
  },
}));
vi.mock('@microsoft/logic-apps-chatbot', () => ({ CoPilotChatbot: () => null }));
vi.mock('@microsoft/logic-apps-designer', () => ({}));
vi.mock('../CodeViewV2', () => ({ default: () => null }));
vi.mock('../../../../../../../libs/designer-v2/src/lib/ui/FloatingRunButton', () => ({ FloatingRunButton: () => null }));
vi.mock('../../../../environments/environment', () => ({ environment: {} }));

// Keep the real connection resolver, cloning and conversion/merge/freshness helpers.
// Only service construction (which otherwise pulls in the entire designer) is stubbed.
vi.mock('@microsoft/logic-apps-shared', async () => {
  const helpers = await import('../../../../../../../libs/logic-apps-shared/src/utils/src/lib/helpers/functions');
  const connections = await import('../../../../../../../libs/logic-apps-shared/src/utils/src/lib/helpers/connections');
  const { guid } = await import('../../../../../../../libs/logic-apps-shared/src/utils/src/lib/helpers/guid');
  class Service {}
  class ConnectionService {
    constructor(public options: ConnectionServiceOptions) {}
  }
  return {
    clone: helpers.clone,
    equals: helpers.equals,
    optional: helpers.optional,
    guid,
    isArmResourceId: connections.isArmResourceId,
    resolveConnectionsReferences: connections.resolveConnectionsReferences,
    StandardConnectionService: ConnectionService,
    BaseApiManagementService: Service,
    BaseAppServiceService: Service,
    BaseChatbotService: Service,
    BaseCopilotWorkflowEditorService: Service,
    BaseExperimentationService: Service,
    BaseUserPreferenceService: Service,
    BaseFunctionService: Service,
    BaseGatewayService: Service,
    BaseRoleService: Service,
    BaseTenantService: Service,
    StandardConnectorService: Service,
    StandardCustomCodeService: Service,
    StandardOperationManifestService: Service,
    StandardRunService: Service,
    StandardSearchService: Service,
    BaseCognitiveServiceService: Service,
    BaseResourceService: Service,
  };
});
vi.mock('../Services/HttpClient', () => ({ HttpClient: class {} }));
vi.mock('../Services/StandardManagement', () => {
  const management = {};
  return { useAzureStandardManagement: () => management };
});
vi.mock('../Services/Artifact', () => ({ ArtifactService: class {} }));
vi.mock('../Services/ChildWorkflow', () => ({ ChildWorkflowService: class {} }));
vi.mock('../Services/FileSystemConnectionCreationClient', () => ({ FileSystemConnectionCreationClient: class {} }));
vi.mock('../Services/OAuthService', () => ({ StandaloneOAuthService: class {} }));
vi.mock('../Services/customConnectionParameterEditorServiceV2', () => ({ CustomConnectionParameterEditorServiceV2: class {} }));
vi.mock('../Services/customEditorService', () => ({ CustomEditorService: class {} }));

const siteId = '/subscriptions/sub/resourceGroups/group/providers/Microsoft.Web/sites/app';
const workflowId = `${siteId}/workflows/workflow`;
const olderTime = '2026-10-20T12:00:00Z';
const productionTime = '2026-10-26T12:00:00Z';
const newestTime = '2026-10-26T15:00:00Z';

type ArtifactSet = {
  workflow: WorkflowJson;
  connections: ConnectionsData;
  parameters: ParametersData;
  notes: NotesData;
};

const artifactSet = (source: string): ArtifactSet => ({
  workflow: {
    kind: 'stateful',
    definition: {
      $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
      contentVersion: '1.0.0.0',
      triggers: { Request: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
      actions: { Compose: { type: 'Compose', inputs: source, runAfter: {} } },
    } satisfies DesignerWorkflow['definition'],
  },
  connections: {
    serviceProviderConnections: {
      sql: {
        serviceProvider: { id: '/serviceProviders/sql' },
        displayName: `SQL ${source}`,
        parameterValues: { server: `${source}.sql.example`, database: source },
      },
    },
  },
  parameters: { source: { type: 'String', value: source } },
  notes: {
    note: {
      content: `Notes ${source}`,
      color: '#ffffff',
      metadata: { position: { x: 1, y: 2 }, width: 200, height: 100 },
    },
  },
});

const vfsFile = (name: string, mtime: string): VFSObject => ({
  name,
  mtime,
  crtime: mtime,
  size: 1,
  mime: 'application/json',
  href: name,
  path: name,
});
const customCode = (production: ArtifactSet, draft: ArtifactSet, prodTime = productionTime, draftTime = olderTime): CustomCodeData => ({
  files: {
    [Artifact.DraftFile]: draft.workflow,
    [VfsArtifact.NotesFile]: production.notes,
    [VfsArtifact.DraftNotesFile]: draft.notes,
  },
  metadata: {
    [Artifact.WorkflowFile]: vfsFile(Artifact.WorkflowFile, prodTime),
    [Artifact.DraftFile]: vfsFile(Artifact.DraftFile, draftTime),
  },
});
const artifacts = (production: ArtifactSet, draft: ArtifactSet): ArtifactResource => ({
  id: workflowId,
  name: 'workflow',
  type: 'Microsoft.Web/sites/workflows',
  location: 'westus',
  properties: {
    flowState: 'Enabled',
    health: { state: 'Healthy' },
    files: {
      [Artifact.WorkflowFile]: production.workflow,
      [Artifact.ConnectionsFile]: production.connections,
      [Artifact.ParametersFile]: production.parameters,
      [Artifact.DraftConnectionsFile]: draft.connections,
      [Artifact.DraftParametersFile]: draft.parameters,
    },
  },
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

// Surface background-query errors without letting an uncaught React exception obscure the assertion.
class ErrorBoundary extends Component<PropsWithChildren, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render(): ReactNode {
    return this.state.error ? <div data-testid="designer-error">{this.state.error.message}</div> : this.props.children;
  }
}

const createHostStore = () =>
  configureStore({
    reducer: {
      workflowLoader: createReducer(
        {
          resourcePath: workflowId,
          appId: siteId,
          isReadOnly: false,
          isMonitoringView: false,
          isDarkMode: false,
          hostingPlan: 'standard',
          language: 'en',
          hostOptions: { displayRuntimeInfo: true, enableMultiVariable: true },
          showChatBot: false,
          runId: undefined as string | undefined,
          showRunHistory: false,
        },
        (builder) => {
          builder
            .addCase(setMonitoringView, (state, action) => {
              state.isMonitoringView = action.payload;
            })
            .addCase(setReadOnly, (state, action) => {
              state.isReadOnly = action.payload;
            })
            .addCase(setRunHistoryEnabled, (state, action) => {
              state.showRunHistory = action.payload;
            })
            .addCase(changeRunId, (state, action) => {
              state.runId = action.payload;
            });
        }
      ),
    },
    // The component's exposed service callbacks intentionally mutate its local connections, not Redux state.
  });

const mountDesigner = () => {
  const store = createHostStore();
  const rendered = render(
    <Provider store={store}>
      <QueryClientProvider client={mocks.queryClient!}>
        <ErrorBoundary>
          <DesignerEditor />
        </ErrorBoundary>
      </QueryClientProvider>
    </Provider>
  );
  return { ...rendered, store };
};
const commandBar = (): CommandBarProps => {
  if (!mocks.commandBar) {
    throw new Error('Designer command bar is not mounted.');
  }
  return mocks.commandBar;
};
const selectedWorkflow = (): DesignerWorkflow => {
  if (!mocks.workflow) {
    throw new Error('BJSWorkflowProvider has not received a workflow.');
  }
  return mocks.workflow;
};
const connectionService = (): ConnectionServiceOptions => {
  if (!mocks.options) {
    throw new Error('DesignerProvider has not received services.');
  }
  return mocks.options.services.connectionService.options;
};
const expectSelectedArtifacts = (selected: ArtifactSet) => {
  expect(selectedWorkflow().definition).toEqual(selected.workflow.definition);
  expect(selectedWorkflow().parameters).toEqual(selected.parameters);
  expect(selectedWorkflow().notes).toEqual(selected.notes);
  expect(selectedWorkflow().connectionReferences.sql).toEqual({
    connection: { id: '/serviceProviders/sql/connections/sql' },
    connectionName: selected.connections.serviceProviderConnections?.sql.displayName,
    api: { id: '/serviceProviders/sql' },
  });
  expect(connectionService().readConnections().serviceProviderConnections).toEqual(selected.connections.serviceProviderConnections);
};

describe('Standard designer draft artifact freshness', () => {
  let production: ArtifactSet;
  let draft: ArtifactSet;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockReset().mockResolvedValue({ status: 200 });
    mocks.deploy.mockReset().mockResolvedValue({ status: 200 });
    mocks.loadArtifacts.mockReset();
    mocks.loadCustomCode.mockReset();
    mocks.options = undefined;
    mocks.commandBar = undefined;
    mocks.workflow = undefined;
    mocks.snapshots = [];
    mocks.settings = { properties: {} };
    mocks.runDefinition = artifactSet('historical-run').workflow.definition;
    mocks.queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0, staleTime: Infinity, refetchOnWindowFocus: false, refetchOnReconnect: false },
      },
      logger: { log: console.log, warn: console.warn, error: vi.fn() },
    });
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    production = artifactSet('production');
    draft = artifactSet('stale-draft');
    mocks.loadArtifacts.mockResolvedValue(artifacts(production, draft));
    mocks.loadCustomCode.mockResolvedValue(customCode(production, draft));
  });

  afterEach(() => {
    cleanup();
    mocks.queryClient?.clear();
    vi.restoreAllMocks();
  });

  it.each([
    { name: 'newer production', draftTime: olderTime, selected: 'production' },
    { name: 'equal timestamps', draftTime: productionTime, selected: 'production' },
    { name: 'newer draft', draftTime: newestTime, selected: 'draft' },
  ])('selects all four artifacts for $name when artifacts arrive before custom metadata', async ({ draftTime, selected }) => {
    const pendingCustomCode = deferred<CustomCodeData>();
    mocks.loadCustomCode.mockReturnValue(pendingCustomCode.promise);
    mountDesigner();
    await waitFor(() => expect(mocks.queryClient?.getQueryData(['artifacts', workflowId])).toBeDefined());
    expect(mocks.loadCustomCode).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('command-bar')).toBeNull();
    expect(mocks.snapshots).toEqual([]);

    await act(async () => {
      pendingCustomCode.resolve(customCode(production, draft, productionTime, draftTime));
    });
    await waitFor(() => expectSelectedArtifacts(selected === 'production' ? production : draft));
    expect(screen.getByTestId('command-bar').getAttribute('data-readonly')).toBe('false');
    expect(mocks.deploy).not.toHaveBeenCalled();
  });

  it('preserves intentionally empty companions of a newer saved draft instead of resurrecting production values', async () => {
    const emptyDraft: ArtifactSet = {
      ...draft,
      connections: {},
      parameters: {},
      notes: {},
    };
    mocks.loadArtifacts.mockResolvedValue(artifacts(production, emptyDraft));
    mocks.loadCustomCode.mockResolvedValue(customCode(production, emptyDraft, productionTime, newestTime));
    mountDesigner();

    await waitFor(() => {
      expect(selectedWorkflow().definition).toEqual(emptyDraft.workflow.definition);
      expect(selectedWorkflow().connectionReferences).toEqual({});
      expect(selectedWorkflow().parameters).toEqual({});
      expect(selectedWorkflow().notes).toEqual({});
      expect(connectionService().readConnections()).toEqual({
        managedApiConnections: {},
        serviceProviderConnections: {},
        functionConnections: {},
        apiManagementConnections: {},
        agentConnections: {},
        agentMcpConnections: {},
      });
    });
    expect(screen.getByTestId('command-bar').getAttribute('data-readonly')).toBe('false');
    expect(mocks.deploy).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('autosaves unchanged production companions with a workflow-only edit and reopens the persisted draft coherently', async () => {
    const mounted = mountDesigner();
    await waitFor(() => expectSelectedArtifacts(production));
    const editedWorkflow = artifactSet('workflow-only-edit').workflow;
    const persisted = structuredClone(draft);
    mocks.save.mockImplementation(async (_site, workflows, connections, parameters, _settings, _host, _code, notes) => {
      // Simulate PATCH-like persistence: omitted companion files keep their old draft contents.
      persisted.workflow = structuredClone(workflows[0].workflow as WorkflowJson);
      if (connections !== undefined) {
        persisted.connections = structuredClone(connections);
      }
      if (parameters !== undefined) {
        persisted.parameters = structuredClone(parameters);
      }
      if (notes !== undefined) {
        persisted.notes = structuredClone(notes);
      }
      return { status: 200 };
    });
    const clearDirtyState = vi.fn();
    await act(async () => {
      await commandBar().saveWorkflow({ ...selectedWorkflow(), definition: editedWorkflow.definition }, undefined, clearDirtyState, true);
    });

    expect(mocks.save).toHaveBeenCalledOnce();
    const saved = mocks.save.mock.calls[0];
    expect(saved[0]).toBe(siteId);
    expect(saved[1]).toEqual([{ name: 'workflow', workflow: editedWorkflow }]);
    expect(saved[2]?.serviceProviderConnections).toEqual(production.connections.serviceProviderConnections);
    expect(saved[3]).toEqual(production.parameters);
    expect(saved[4]).toBeUndefined();
    expect(saved[7]).toEqual(production.notes);
    expect(saved[9]).toBe(clearDirtyState);
    expect(saved[11]).toBe(true);

    mounted.unmount();
    mocks.queryClient?.clear();
    mocks.loadArtifacts.mockResolvedValue(artifacts(production, persisted));
    mocks.loadCustomCode.mockResolvedValue(customCode(production, persisted, productionTime, newestTime));
    mountDesigner();
    await waitFor(() => expectSelectedArtifacts({ ...production, workflow: editedWorkflow }));
    expect(mocks.save).toHaveBeenCalledOnce();
  });

  it('preserves app-setting references when persisting production connections over a stale draft', async () => {
    const settingReference = "@appsetting('SQL_SERVER')";
    production.connections.serviceProviderConnections!.sql.parameterValues.server = settingReference;
    mocks.settings = { properties: { SQL_SERVER: 'resolved.sql.example.invalid' } };
    mountDesigner();

    await waitFor(() => {
      expect(selectedWorkflow().definition).toEqual(production.workflow.definition);
      expect(connectionService().readConnections().serviceProviderConnections?.sql.parameterValues.server).toBe(
        'resolved.sql.example.invalid'
      );
    });
    await act(async () => {
      await commandBar().saveWorkflow(selectedWorkflow(), undefined, vi.fn(), true);
    });

    expect(mocks.save.mock.calls[0][2]?.serviceProviderConnections?.sql.parameterValues.server).toBe(settingReference);
    expect(mocks.save.mock.calls[0][3]).toEqual(production.parameters);
    expect(mocks.save.mock.calls[0][7]).toEqual(production.notes);
  });

  it('refreshes both sources after monitoring, restores fresh production all4, and preserves only genuine local connection additions', async () => {
    draft.connections.serviceProviderConnections!.retired = {
      serviceProvider: { id: '/serviceProviders/sql' },
      displayName: 'Retired server connection',
      parameterValues: { server: 'retired.sql.example' },
    };
    mocks.loadCustomCode.mockResolvedValue(customCode(production, draft, olderTime, productionTime));
    const { store } = mountDesigner();
    await waitFor(() => expectSelectedArtifacts(draft));
    const localConnection: ConnectionAndAppSetting = {
      connectionKey: 'localSql',
      connectionData: {
        serviceProvider: { id: '/serviceProviders/sql' },
        displayName: 'Local SQL addition',
        parameterValues: { server: 'local.sql.example' },
      },
      pathLocation: ['serviceProviderConnections'],
      settings: {},
    };
    await act(async () => {
      await connectionService().writeConnection(localConnection);
      commandBar().showMonitoringView();
      store.dispatch(changeRunId('historical-run'));
    });
    await waitFor(() => expect(selectedWorkflow().definition).toEqual(mocks.runDefinition));
    expect(screen.getByTestId('command-bar').getAttribute('data-readonly')).toBe('true');
    const snapshotStart = mocks.snapshots.length;
    const freshProduction = artifactSet('fresh-production');
    const pendingArtifacts = deferred<ArtifactResource>();
    const pendingCustomCode = deferred<CustomCodeData>();
    mocks.loadArtifacts.mockReturnValue(pendingArtifacts.promise);
    mocks.loadCustomCode.mockReturnValue(pendingCustomCode.promise);

    act(() => {
      commandBar().showDesignerView();
    });
    await waitFor(() => {
      expect(mocks.customCodeRefetch).toHaveBeenCalledWith({ throwOnError: true });
      expect(mocks.artifactsRefetch).toHaveBeenCalledWith({ throwOnError: true });
    });
    await act(async () => {
      pendingCustomCode.resolve(customCode(freshProduction, draft, newestTime, productionTime));
    });
    expect(store.getState().workflowLoader.isMonitoringView).toBe(true);
    expect(screen.getByTestId('command-bar').getAttribute('data-readonly')).toBe('true');
    await act(async () => {
      pendingArtifacts.resolve(artifacts(freshProduction, draft));
    });
    await waitFor(() => {
      expect(store.getState().workflowLoader.isMonitoringView).toBe(false);
      expect(selectedWorkflow().definition).toEqual(freshProduction.workflow.definition);
      expect(selectedWorkflow().parameters).toEqual(freshProduction.parameters);
      expect(selectedWorkflow().notes).toEqual(freshProduction.notes);
      expect(connectionService().readConnections().serviceProviderConnections).toEqual({
        ...freshProduction.connections.serviceProviderConnections,
        localSql: localConnection.connectionData,
      });
      expect(selectedWorkflow().connectionReferences.sql.connectionName).toBe('SQL fresh-production');
      expect(selectedWorkflow().connectionReferences.localSql.connectionName).toBe('Local SQL addition');
      expect(selectedWorkflow().connectionReferences.retired).toBeUndefined();
    });
    const editableSnapshots = mocks.snapshots.slice(snapshotStart).filter((snapshot) => !snapshot.readOnly && !snapshot.monitoring);
    expect(editableSnapshots.length).toBeGreaterThan(0);
    for (const snapshot of editableSnapshots) {
      expect(snapshot.workflow.definition).toEqual(freshProduction.workflow.definition);
    }
    expect(mocks.loadArtifacts).toHaveBeenCalledTimes(2);
    expect(mocks.loadCustomCode).toHaveBeenCalledTimes(2);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it.each([
    { source: 'custom code', target: 'designer' },
    { source: 'production artifacts', target: 'designer' },
    { source: 'custom code', target: 'code view' },
    { source: 'production artifacts', target: 'code view' },
  ])('keeps monitoring readonly when refreshing $source before opening $target fails', async ({ source, target }) => {
    const { store } = mountDesigner();
    await waitFor(() => expectSelectedArtifacts(production));
    await act(async () => {
      commandBar().showMonitoringView();
      store.dispatch(changeRunId('historical-run'));
    });
    await waitFor(() => expect(selectedWorkflow().definition).toEqual(mocks.runDefinition));
    const error = new Error(`${source} refresh failed`);
    const failingRequest = source === 'custom code' ? mocks.loadCustomCode : mocks.loadArtifacts;
    failingRequest.mockRejectedValue(error);
    act(() => {
      if (target === 'designer') {
        commandBar().showDesignerView();
      } else {
        commandBar().showCodeView();
      }
    });

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(`Unable to restore the workflow after monitoring: ${error}`));
    expect(mocks.customCodeRefetch).toHaveBeenCalledWith({ throwOnError: true });
    expect(mocks.artifactsRefetch).toHaveBeenCalledWith({ throwOnError: true });
    expect(store.getState().workflowLoader.isMonitoringView).toBe(true);
    expect(store.getState().workflowLoader.isReadOnly).toBe(true);
    // Require the actual mounted monitoring UI, not stale captured props after an error/unmount.
    await waitFor(() => {
      expect(screen.queryByTestId('designer-error')).toBeNull();
      expect(screen.getByTestId('command-bar').getAttribute('data-monitoring')).toBe('true');
      expect(screen.getByTestId('command-bar').getAttribute('data-readonly')).toBe('true');
      expect(screen.getByTestId('command-bar').getAttribute('data-codeview')).toBe('false');
      expect(selectedWorkflow().definition).toEqual(mocks.runDefinition);
    });
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
