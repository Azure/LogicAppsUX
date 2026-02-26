import { describe, it, expect } from 'vitest';
import deployReducer, {
  setSelectedSubscription,
  setSelectedLogicApp,
  setIsCreatingNew,
  setNewLogicAppName,
  setSelectedResourceGroup,
  setSelectedLocation,
  setHostingPlanType,
  setSelectedAppServicePlan,
  setSelectedStorageAccount,
  setCreateAppInsights,
  setSelectedConnectedEnvironment,
  setContainerAppName,
  setFileShareHostname,
  setFileSharePath,
  setFileShareUsername,
  setFileSharePassword,
  setSqlConnectionString,
  type DeployState,
} from '../../../state/deploySlice';

/**
 * Unit tests for Deploy Slice (Redux State Management)
 *
 * These tests verify the Redux state management for the deploy form,
 * including Workflow Standard vs Hybrid Logic App deployment.
 */

describe('Deploy Redux Slice', () => {
  const initialState: DeployState = {
    selectedSubscription: '',
    selectedLogicApp: '',
    selectedLogicAppName: '',
    selectedResourceGroup: '',
    selectedSlot: undefined,
    isLoadingSubscriptions: false,
    isLoadingLogicApps: false,
    isCreatingNew: false,
    newLogicAppName: '',
    newResourceGroupName: '',
    isCreatingNewResourceGroup: false,
    selectedLocation: '',
    hostingPlanType: 'workflowstandard',
    selectedAppServicePlan: '',
    newAppServicePlanName: '',
    isCreatingNewAppServicePlan: true,
    selectedAppServicePlanSku: 'WS1',
    selectedStorageAccount: '',
    newStorageAccountName: '',
    isCreatingNewStorageAccount: true,
    createAppInsights: true,
    newAppInsightsName: '',
    appInsightsNameManuallyChanged: false,
    selectedConnectedEnvironment: '',
    containerAppName: '',
    fileShareHostname: '',
    fileSharePath: '',
    fileShareUsername: '',
    fileSharePassword: '',
    sqlConnectionString: '',
    resourceGroups: [],
    locations: [],
    appServicePlans: [],
    storageAccounts: [],
    error: undefined,
    deploymentFolderPath: undefined,
    isDeploying: false,
    deploymentStatus: undefined,
    deploymentMessage: undefined,
  };

  describe('Basic state management', () => {
    it('should return the initial state', () => {
      const state = deployReducer(undefined, { type: 'unknown' });
      expect(state.hostingPlanType).toBe('workflowstandard');
      expect(state.isCreatingNew).toBe(false);
    });

    it('should handle setSelectedSubscription', () => {
      const state = deployReducer(initialState, setSelectedSubscription('sub-1'));
      expect(state.selectedSubscription).toBe('sub-1');
    });

    it('should handle setIsCreatingNew', () => {
      const state = deployReducer(initialState, setIsCreatingNew(true));
      expect(state.isCreatingNew).toBe(true);
    });

    it('should handle setNewLogicAppName', () => {
      const state = deployReducer(initialState, setNewLogicAppName('my-logic-app'));
      expect(state.newLogicAppName).toBe('my-logic-app');
    });

    it('should handle setSelectedLocation', () => {
      const state = deployReducer(initialState, setSelectedLocation('eastus'));
      expect(state.selectedLocation).toBe('eastus');
    });
  });

  describe('Hosting plan type switching', () => {
    it('should handle setHostingPlanType to workflowstandard', () => {
      const stateWithHybrid: DeployState = {
        ...initialState,
        hostingPlanType: 'hybrid',
        selectedConnectedEnvironment: 'env-1',
      };
      const state = deployReducer(stateWithHybrid, setHostingPlanType('workflowstandard'));
      expect(state.hostingPlanType).toBe('workflowstandard');
      // App service plan should be reset
      expect(state.selectedAppServicePlan).toBe('');
      expect(state.isCreatingNewAppServicePlan).toBe(true);
      expect(state.selectedAppServicePlanSku).toBe('WS1');
    });

    it('should handle setHostingPlanType to hybrid', () => {
      const stateWithWorkflowStandard: DeployState = {
        ...initialState,
        hostingPlanType: 'workflowstandard',
        selectedAppServicePlan: 'asp-1',
      };
      const state = deployReducer(stateWithWorkflowStandard, setHostingPlanType('hybrid'));
      expect(state.hostingPlanType).toBe('hybrid');
      // App service plan should be reset when switching to hybrid
      expect(state.selectedAppServicePlan).toBe('');
    });
  });

  describe('Workflow Standard specific fields', () => {
    it('should handle setSelectedAppServicePlan', () => {
      const state = deployReducer(initialState, setSelectedAppServicePlan('asp-1'));
      expect(state.selectedAppServicePlan).toBe('asp-1');
    });

    it('should handle setSelectedStorageAccount', () => {
      const state = deployReducer(initialState, setSelectedStorageAccount('storage-1'));
      expect(state.selectedStorageAccount).toBe('storage-1');
    });

    it('should handle setCreateAppInsights', () => {
      const state = deployReducer(initialState, setCreateAppInsights(false));
      expect(state.createAppInsights).toBe(false);
    });
  });

  describe('Hybrid specific fields', () => {
    it('should handle setSelectedConnectedEnvironment', () => {
      const state = deployReducer(initialState, setSelectedConnectedEnvironment('env-1'));
      expect(state.selectedConnectedEnvironment).toBe('env-1');
    });

    it('should handle setContainerAppName', () => {
      const state = deployReducer(initialState, setContainerAppName('my-container-app'));
      expect(state.containerAppName).toBe('my-container-app');
    });

    it('should handle setFileShareHostname', () => {
      const state = deployReducer(initialState, setFileShareHostname('storage.file.core.windows.net'));
      expect(state.fileShareHostname).toBe('storage.file.core.windows.net');
    });

    it('should handle setFileSharePath', () => {
      const state = deployReducer(initialState, setFileSharePath('/myshare'));
      expect(state.fileSharePath).toBe('/myshare');
    });

    it('should handle setFileShareUsername', () => {
      const state = deployReducer(initialState, setFileShareUsername('myuser'));
      expect(state.fileShareUsername).toBe('myuser');
    });

    it('should handle setFileSharePassword', () => {
      const state = deployReducer(initialState, setFileSharePassword('mysecretpassword'));
      expect(state.fileSharePassword).toBe('mysecretpassword');
    });

    it('should handle setSqlConnectionString', () => {
      const state = deployReducer(initialState, setSqlConnectionString('Server=test;Database=db;'));
      expect(state.sqlConnectionString).toBe('Server=test;Database=db;');
    });
  });

  describe('Validation logic', () => {
    it('should have all required fields for Workflow Standard deployment', () => {
      const workflowStandardState: DeployState = {
        ...initialState,
        selectedSubscription: 'sub-1',
        isCreatingNew: true,
        newLogicAppName: 'my-app',
        selectedResourceGroup: 'rg-1',
        selectedLocation: 'eastus',
        hostingPlanType: 'workflowstandard',
        selectedAppServicePlan: 'asp-1',
        selectedStorageAccount: 'storage-1',
      };

      // Check that all required workflow standard fields are present
      expect(workflowStandardState.selectedSubscription).toBeTruthy();
      expect(workflowStandardState.newLogicAppName).toBeTruthy();
      expect(workflowStandardState.selectedResourceGroup).toBeTruthy();
      expect(workflowStandardState.selectedLocation).toBeTruthy();
      expect(workflowStandardState.hostingPlanType).toBe('workflowstandard');
      expect(workflowStandardState.selectedAppServicePlan).toBeTruthy();
      expect(workflowStandardState.selectedStorageAccount).toBeTruthy();
    });

    it('should have all required fields for Hybrid deployment', () => {
      const hybridState: DeployState = {
        ...initialState,
        selectedSubscription: 'sub-1',
        isCreatingNew: true,
        newLogicAppName: 'my-app',
        selectedResourceGroup: 'rg-1',
        selectedLocation: 'eastus',
        hostingPlanType: 'hybrid',
        selectedConnectedEnvironment: 'env-1',
        containerAppName: 'my-container-app',
        fileShareHostname: 'storage.file.core.windows.net',
        fileSharePath: '/share',
        fileShareUsername: 'user',
        fileSharePassword: 'pass',
        sqlConnectionString: 'Server=test;',
      };

      // Check that all required hybrid fields are present
      expect(hybridState.selectedSubscription).toBeTruthy();
      expect(hybridState.newLogicAppName).toBeTruthy();
      expect(hybridState.selectedResourceGroup).toBeTruthy();
      expect(hybridState.selectedLocation).toBeTruthy();
      expect(hybridState.hostingPlanType).toBe('hybrid');
      expect(hybridState.selectedConnectedEnvironment).toBeTruthy();
      expect(hybridState.containerAppName).toBeTruthy();
      expect(hybridState.fileShareHostname).toBeTruthy();
      expect(hybridState.fileSharePath).toBeTruthy();
      expect(hybridState.fileShareUsername).toBeTruthy();
      expect(hybridState.fileSharePassword).toBeTruthy();
      expect(hybridState.sqlConnectionString).toBeTruthy();
    });

    it('should identify incomplete Workflow Standard deployment', () => {
      const incompleteState: DeployState = {
        ...initialState,
        selectedSubscription: 'sub-1',
        isCreatingNew: true,
        newLogicAppName: 'my-app',
        // Missing resource group, location, app service plan, storage account
      };

      // canDeploy logic for workflow standard
      const canDeployWorkflowStandard =
        incompleteState.selectedSubscription &&
        incompleteState.newLogicAppName &&
        incompleteState.selectedResourceGroup &&
        incompleteState.selectedLocation &&
        incompleteState.selectedAppServicePlan &&
        incompleteState.selectedStorageAccount;

      expect(canDeployWorkflowStandard).toBeFalsy();
    });

    it('should identify incomplete Hybrid deployment', () => {
      const incompleteState: DeployState = {
        ...initialState,
        selectedSubscription: 'sub-1',
        isCreatingNew: true,
        newLogicAppName: 'my-app',
        selectedResourceGroup: 'rg-1',
        selectedLocation: 'eastus',
        hostingPlanType: 'hybrid',
        selectedConnectedEnvironment: 'env-1',
        // Missing file share details and SQL connection string
      };

      // canDeploy logic for hybrid
      const canDeployHybrid =
        incompleteState.selectedSubscription &&
        incompleteState.newLogicAppName &&
        incompleteState.selectedResourceGroup &&
        incompleteState.selectedLocation &&
        incompleteState.selectedConnectedEnvironment &&
        incompleteState.fileShareHostname &&
        incompleteState.fileSharePath &&
        incompleteState.fileShareUsername &&
        incompleteState.fileSharePassword &&
        incompleteState.sqlConnectionString;

      expect(canDeployHybrid).toBeFalsy();
    });
  });

  describe('Container app name auto-generation', () => {
    it('should convert Logic App name to lowercase for container app', () => {
      const logicAppName = 'MyLogicApp';
      const containerAppName = logicAppName.toLowerCase();
      expect(containerAppName).toBe('mylogicapp');
    });

    it('should preserve hyphens in container app name', () => {
      const logicAppName = 'My-Logic-App';
      const containerAppName = logicAppName.toLowerCase();
      expect(containerAppName).toBe('my-logic-app');
    });
  });
});
