import { configureStore } from '@reduxjs/toolkit';
import * as services from '@microsoft/logic-apps-shared';
import type { ServiceOptions } from '../designerOptions/designerOptionsInterfaces';
import reducer, { initializeServices } from '../designerOptions/designerOptionsSlice';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const initializers = vi.hoisted(() => ({
  connectionService: 'InitConnectionService',
  operationManifestService: 'InitOperationManifestService',
  searchService: 'InitSearchService',
  connectorService: 'InitConnectorService',
  gatewayService: 'InitGatewayService',
  tenantService: 'InitTenantService',
  oAuthService: 'InitOAuthService',
  workflowService: 'InitWorkflowService',
  hostService: 'InitHostService',
  apimService: 'InitApiManagementService',
  functionService: 'InitFunctionService',
  appServiceService: 'InitAppServiceService',
  runService: 'InitRunService',
  roleService: 'InitRoleService',
  editorService: 'InitEditorService',
  connectionParameterEditorService: 'InitConnectionParameterEditorService',
  chatbotService: 'InitChatbotService',
  customCodeService: 'InitCustomCodeService',
  uiInteractionsService: 'InitUiInteractionsService',
  userPreferenceService: 'InitUserPreferenceService',
  experimentationService: 'InitExperimentationServiceService',
  cognitiveServiceService: 'InitCognitiveServiceService',
  copilotWorkflowEditorService: 'InitCopilotWorkflowEditorService',
  resourceService: 'InitResourceService',
}));
vi.mock('@microsoft/logic-apps-shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@microsoft/logic-apps-shared')>()),
  ...Object.fromEntries([...Object.values(initializers), 'InitLoggerService'].map((name) => [name, vi.fn()])),
}));

beforeEach(() => vi.clearAllMocks());

describe('provider service initialization', () => {
  it('preserves every supplied service and marks the real reducer ready after initialization completes', async () => {
    const store = configureStore({ reducer });
    const supplied = Object.fromEntries(
      [...Object.keys(initializers), 'loggerService'].map((name) => [name, { name }])
    ) as unknown as ServiceOptions;
    await store.dispatch(initializeServices(supplied));
    for (const [option, initializer] of Object.entries(initializers)) {
      expect(services[initializer as keyof typeof services]).toHaveBeenCalledWith(supplied[option as keyof ServiceOptions]);
    }
    expect(services.InitLoggerService).toHaveBeenCalledWith(expect.arrayContaining([supplied.loggerService]));
    expect(store.getState().servicesInitialized).toBe(true);
  });

  it('does not replace omitted optional services and still initializes default-aware services', async () => {
    const store = configureStore({ reducer });
    await store.dispatch(initializeServices({} as ServiceOptions));
    for (const option of ['connectorService', 'gatewayService', 'runService', 'resourceService'] as const) {
      expect(services[initializers[option] as keyof typeof services]).not.toHaveBeenCalled();
    }
    expect(services.InitExperimentationServiceService).toHaveBeenCalledWith(undefined);
    expect(services.InitEditorService).toHaveBeenCalledWith(undefined);
    expect(store.getState().servicesInitialized).toBe(true);
  });
});
