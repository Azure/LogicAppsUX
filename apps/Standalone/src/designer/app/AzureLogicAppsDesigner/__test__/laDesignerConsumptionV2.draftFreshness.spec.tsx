// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FloatingRunButtonProps, Workflow } from '@microsoft/logic-apps-designer-v2';
import type { saveWorkflowConsumption } from '../Services/WorkflowAndArtifacts';
import DesignerEditorConsumption from '../laDesignerConsumptionV2';

const mocks = vi.hoisted(() => ({
  save: vi.fn<typeof saveWorkflowConsumption>(),
  runButton: undefined as FloatingRunButtonProps | undefined,
  workflow: undefined as Workflow | undefined,
}));

const resource = (source: string, changedTime: string) => ({
  id: '/subscriptions/sub/resourceGroups/group/providers/Microsoft.Logic/workflows/workflow',
  location: 'westus',
  properties: {
    changedTime,
    definition: {
      triggers: { manual: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
      actions: { Compose: { type: 'Compose', inputs: source } },
    },
  },
});
const production = resource('production', '2026-10-26T12:00:00Z');
const draft = resource('stale-draft', '2026-10-20T12:00:00Z');

vi.mock('../Services/WorkflowAndArtifacts', () => ({
  useWorkflowAndArtifactsConsumption: (_id: string, isDraft?: boolean) => ({
    data: isDraft ? draft : production,
    isFetching: false,
  }),
  useCurrentObjectId: () => ({ data: 'object' }),
  useCurrentTenantId: () => ({ data: 'tenant' }),
  useRunInstanceConsumption: () => ({ data: undefined }),
  saveWorkflowConsumption: mocks.save,
}));
vi.mock('@microsoft/logic-apps-designer-v2', () => ({
  DesignerProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  BJSWorkflowProvider: ({ children, workflow }: PropsWithChildren<{ workflow: Workflow }>) => {
    mocks.workflow = workflow;
    return <>{children}</>;
  },
  Designer: () => null,
  CombineInitializeVariableDialog: () => null,
  TriggerDescriptionDialog: () => null,
  FloatingRunButton: (props: FloatingRunButtonProps) => {
    mocks.runButton = props;
    return null;
  },
  getSKUDefaultHostOptions: () => ({}),
  getReactQueryClient: () => ({}),
  isOpenApiSchemaVersion: () => false,
  Constants: { SKU: { CONSUMPTION: 'consumption' } },
}));
vi.mock('@microsoft/logic-apps-designer', () => ({ isOpenApiSchemaVersion: () => false }));
vi.mock('@microsoft/logic-apps-shared', async () => {
  const { sanitizeNotes } = await import('../../../../../../../libs/logic-apps-shared/src/utils/src/lib/helpers/notes');
  class Service {}
  return {
    sanitizeNotes,
    guid: () => 'designer-id',
    ConsumptionConnectionService: Service,
    ConsumptionConnectorService: Service,
    ConsumptionOperationManifestService: Service,
    ConsumptionSearchService: Service,
    ConsumptionRunService: Service,
    StandardCustomCodeService: Service,
    BaseApiManagementService: Service,
    BaseAppServiceService: Service,
    BaseFunctionService: Service,
    BaseGatewayService: Service,
    BaseTenantService: Service,
    BaseChatbotService: Service,
    BaseCopilotWorkflowEditorService: Service,
    BaseUserPreferenceService: Service,
    BaseCognitiveServiceService: Service,
    BaseRoleService: Service,
  };
});
vi.mock('../DesignerCommandBarV2', () => ({
  DesignerCommandBar: () => null,
}));
vi.mock('@microsoft/logic-apps-chatbot', () => ({ CoPilotChatbot: () => null }));
vi.mock('../CodeViewV2', () => ({ default: () => null }));
vi.mock('../Services/ChildWorkflow', () => ({ ChildWorkflowService: class {} }));
vi.mock('../Services/HttpClient', () => ({ HttpClient: class {} }));
vi.mock('../Services/OAuthService', () => ({ StandaloneOAuthService: class {} }));
vi.mock('../../../../environments/environment', () => ({ environment: {} }));

describe('Consumption draft save safety', () => {
  beforeEach(() => {
    mocks.save.mockReset();
    mocks.runButton = undefined;
    mocks.workflow = undefined;
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not report a saved workflow when the forced draft save fails', async () => {
    const store = configureStore({
      reducer: {
        workflowLoader: () => ({
          resourcePath: production.id,
          appId: production.id,
          language: 'en',
          hostOptions: {},
        }),
      },
    });
    const failure = new Error('Draft PUT failed');
    mocks.save.mockImplementation(async (_resource, _workflow, _clearDirtyState, options) => {
      // The service only propagates an HTTP failure when its caller requests it.
      if (options?.throwError) {
        throw failure;
      }
    });
    render(
      <Provider store={store}>
        <DesignerEditorConsumption />
      </Provider>
    );
    await waitFor(() => {
      expect(mocks.workflow?.definition).toEqual(production.properties.definition);
      expect(mocks.runButton?.forceSave).toBe(true);
    });
    const button = mocks.runButton;
    const workflow = mocks.workflow;
    if (!button || !workflow) {
      throw new Error('Consumption designer has not initialized.');
    }
    const clearDirtyState = vi.fn();
    let response: unknown;
    await act(async () => {
      response = await button.saveDraftWorkflow(workflow, undefined, clearDirtyState, true);
    });
    expect(mocks.save.mock.calls[0][3]).toEqual({ throwError: true });
    expect(response).toBeUndefined();
    expect(clearDirtyState).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(failure);
    expect(window.alert).toHaveBeenCalledWith('Error saving workflow, check console for error object');
  });
});
