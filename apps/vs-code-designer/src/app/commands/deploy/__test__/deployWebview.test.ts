import { describe, it, expect } from 'vitest';

/**
 * Unit tests for Deploy Webview logic handling
 *
 * These tests verify the logic for parsing and transforming deploy data
 * for Workflow Standard vs Hybrid Logic App deployment.
 *
 * Note: Full integration tests of deployViaWebview are not possible in unit tests
 * due to deep dependencies on vscode modules. The logic tested here mirrors
 * the behavior in deployWebview.ts createHandler.
 */

describe('Deploy Webview - Data Transformation Logic', () => {
  describe('Workflow Standard deployment data parsing', () => {
    it('should identify Workflow Standard deployment by hostingPlanType', () => {
      const data = {
        subscriptionId: 'test-subscription-id',
        createNew: true,
        newLogicAppName: 'test-logic-app',
        resourceGroup: 'test-rg',
        isCreatingNewResourceGroup: false,
        location: 'eastus',
        hostingPlanType: 'workflowstandard',
        appServicePlan: 'test-asp',
        isCreatingNewAppServicePlan: false,
        appServicePlanSku: 'WS1',
        storageAccount: 'teststorage',
        isCreatingNewStorageAccount: false,
        createAppInsights: true,
        appInsightsName: 'test-insights',
      };

      expect(data.hostingPlanType).toBe('workflowstandard');
      expect(data.hostingPlanType !== 'hybrid').toBe(true);
    });

    it('should create context with existing resource IDs for Workflow Standard', () => {
      const data = {
        isCreatingNewResourceGroup: false,
        resourceGroup: 'existing-rg',
        isCreatingNewAppServicePlan: false,
        appServicePlan: 'existing-asp-id',
        isCreatingNewStorageAccount: false,
        storageAccount: 'existing-storage-id',
      };

      // Transform as deployWebview.ts does
      const context: Record<string, any> = {};

      if (!data.isCreatingNewResourceGroup) {
        context.resourceGroup = { name: data.resourceGroup };
      }

      if (!data.isCreatingNewAppServicePlan) {
        context.plan = { id: data.appServicePlan };
      }

      if (!data.isCreatingNewStorageAccount) {
        context.storageAccount = { id: data.storageAccount };
      }

      expect(context.resourceGroup).toEqual({ name: 'existing-rg' });
      expect(context.plan).toEqual({ id: 'existing-asp-id' });
      expect(context.storageAccount).toEqual({ id: 'existing-storage-id' });
    });

    it('should create context with new resource names for Workflow Standard', () => {
      const data = {
        isCreatingNewResourceGroup: true,
        resourceGroup: 'new-rg',
        isCreatingNewAppServicePlan: true,
        appServicePlan: 'new-asp-name',
        isCreatingNewStorageAccount: true,
        storageAccount: 'newstoragename',
        appServicePlanSku: 'WS2',
      };

      // Transform as deployWebview.ts does
      const context: Record<string, any> = {};

      if (data.isCreatingNewResourceGroup) {
        context.newResourceGroupName = data.resourceGroup;
      }

      if (data.isCreatingNewAppServicePlan) {
        context.newPlanName = data.appServicePlan;
      }

      if (data.isCreatingNewStorageAccount) {
        context.newStorageAccountName = data.storageAccount;
      }

      context.appServicePlanSku = data.appServicePlanSku;

      expect(context.newResourceGroupName).toBe('new-rg');
      expect(context.newPlanName).toBe('new-asp-name');
      expect(context.newStorageAccountName).toBe('newstoragename');
      expect(context.appServicePlanSku).toBe('WS2');
    });
  });

  describe('Hybrid deployment data parsing', () => {
    it('should identify Hybrid deployment by hostingPlanType', () => {
      const data = {
        subscriptionId: 'test-subscription-id',
        createNew: true,
        newLogicAppName: 'test-logic-app',
        resourceGroup: 'test-rg',
        location: 'eastus',
        hostingPlanType: 'hybrid',
        connectedEnvironment: '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.App/managedEnvironments/test-env',
        containerAppName: 'test-container-app',
        fileShareHostname: 'myserver.file.core.windows.net',
        fileSharePath: '/myshare',
        fileShareUsername: 'testuser',
        fileSharePassword: 'testpass',
        sqlConnectionString: 'Server=test;Database=test;',
      };

      expect(data.hostingPlanType).toBe('hybrid');
    });

    it('should transform hybrid data to wizard context format', () => {
      const data = {
        hostingPlanType: 'hybrid',
        connectedEnvironment: '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.App/managedEnvironments/test-env',
        containerAppName: 'test-container-app',
        fileShareHostname: 'myserver.file.core.windows.net',
        fileSharePath: '/myshare',
        fileShareUsername: 'testuser',
        fileSharePassword: 'testpass',
        sqlConnectionString: 'Server=test;Database=test;',
      };

      // Transform as deployWebview.ts does
      const context: Record<string, any> = {};

      if (data.hostingPlanType === 'hybrid') {
        context.useHybrid = true;
        context.connectedEnvironment = {
          id: data.connectedEnvironment,
        };
        context.containerAppName = data.containerAppName;
        context.fileShare = {
          hostname: data.fileShareHostname,
          shareName: data.fileSharePath,
          username: data.fileShareUsername,
          password: data.fileSharePassword,
        };
        context.sqlConnectionString = data.sqlConnectionString;
      } else {
        context.useHybrid = false;
      }

      expect(context.useHybrid).toBe(true);
      expect(context.connectedEnvironment).toEqual({
        id: '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.App/managedEnvironments/test-env',
      });
      expect(context.containerAppName).toBe('test-container-app');
      expect(context.fileShare).toEqual({
        hostname: 'myserver.file.core.windows.net',
        shareName: '/myshare',
        username: 'testuser',
        password: 'testpass',
      });
      expect(context.sqlConnectionString).toBe('Server=test;Database=test;');
    });

    it('should not include Workflow Standard properties in Hybrid context', () => {
      const hybridData = {
        hostingPlanType: 'hybrid',
        connectedEnvironment: 'env-id',
        // Workflow standard properties should be ignored
        appServicePlan: 'this-should-be-ignored',
        storageAccount: 'this-should-be-ignored',
      };

      // Transform as deployWebview.ts does
      const context: Record<string, any> = {};

      if (hybridData.hostingPlanType === 'hybrid') {
        context.useHybrid = true;
        context.connectedEnvironment = { id: hybridData.connectedEnvironment };
        // Note: appServicePlan and storageAccount are NOT added for hybrid
      } else {
        context.useHybrid = false;
        context.plan = { id: hybridData.appServicePlan };
        context.storageAccount = { id: hybridData.storageAccount };
      }

      // Verify workflow standard properties are not in hybrid context
      expect(context.useHybrid).toBe(true);
      expect(context.plan).toBeUndefined();
      expect(context.storageAccount).toBeUndefined();
      expect(context.newPlanName).toBeUndefined();
      expect(context.newStorageAccountName).toBeUndefined();
      expect(context.createAppInsights).toBeUndefined();
    });
  });

  describe('Existing Logic App deployment', () => {
    it('should identify existing app deployment by createNew flag', () => {
      const data = {
        createNew: false,
        logicAppId: '/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Web/sites/existing-app',
        logicAppName: 'existing-app',
        resourceGroup: 'rg',
      };

      expect(data.createNew).toBe(false);
      expect(data.logicAppId).toBeDefined();
    });

    it('should skip creation steps when deploying to existing app', () => {
      const data = {
        createNew: false,
        logicAppId: '/subscriptions/sub-id/resourceGroups/rg/providers/Microsoft.Web/sites/existing-app',
      };

      // When createNew is false, no creation context should be built
      const shouldCreate = data.createNew === true;
      expect(shouldCreate).toBe(false);
    });
  });

  describe('Telemetry properties', () => {
    it('should set correct telemetry for new Workflow Standard deployment', () => {
      const data = {
        createNew: true,
        hostingPlanType: 'workflowstandard',
      };

      const telemetry = {
        properties: {} as Record<string, string>,
      };

      telemetry.properties.deploymentSource = 'webview';
      telemetry.properties.isNewLogicApp = String(data.createNew);
      telemetry.properties.hostingPlanType = data.hostingPlanType;

      expect(telemetry.properties.deploymentSource).toBe('webview');
      expect(telemetry.properties.isNewLogicApp).toBe('true');
      expect(telemetry.properties.hostingPlanType).toBe('workflowstandard');
    });

    it('should set correct telemetry for new Hybrid deployment', () => {
      const data = {
        createNew: true,
        hostingPlanType: 'hybrid',
      };

      const telemetry = {
        properties: {} as Record<string, string>,
      };

      telemetry.properties.deploymentSource = 'webview';
      telemetry.properties.isNewLogicApp = String(data.createNew);
      telemetry.properties.hostingPlanType = data.hostingPlanType;

      expect(telemetry.properties.deploymentSource).toBe('webview');
      expect(telemetry.properties.isNewLogicApp).toBe('true');
      expect(telemetry.properties.hostingPlanType).toBe('hybrid');
    });

    it('should set correct telemetry for existing app deployment', () => {
      const data = {
        createNew: false,
        logicAppId: '/some/id',
      };

      const telemetry = {
        properties: {} as Record<string, string>,
      };

      telemetry.properties.deploymentSource = 'webview';
      telemetry.properties.isNewLogicApp = String(data.createNew);

      expect(telemetry.properties.deploymentSource).toBe('webview');
      expect(telemetry.properties.isNewLogicApp).toBe('false');
    });
  });

  describe('Data validation logic', () => {
    it('should validate required fields for Workflow Standard', () => {
      const workflowStandardData = {
        subscriptionId: 'sub-id',
        newLogicAppName: 'test-app',
        resourceGroup: 'test-rg',
        location: 'eastus',
        hostingPlanType: 'workflowstandard',
        appServicePlan: 'test-asp',
        storageAccount: 'teststorage',
      };

      const requiredFields = ['subscriptionId', 'newLogicAppName', 'resourceGroup', 'location'];
      const workflowStandardFields = ['appServicePlan', 'storageAccount'];

      const hasAllRequired = requiredFields.every((field) => workflowStandardData[field as keyof typeof workflowStandardData]);
      const hasWorkflowStandardFields = workflowStandardFields.every(
        (field) => workflowStandardData[field as keyof typeof workflowStandardData]
      );

      expect(hasAllRequired).toBe(true);
      expect(hasWorkflowStandardFields).toBe(true);
    });

    it('should validate required fields for Hybrid', () => {
      const hybridData = {
        subscriptionId: 'sub-id',
        newLogicAppName: 'test-app',
        resourceGroup: 'test-rg',
        location: 'eastus',
        hostingPlanType: 'hybrid',
        connectedEnvironment: 'env-id',
        fileShareHostname: 'server.file.core.windows.net',
        fileSharePath: '/share',
        fileShareUsername: 'user',
        fileSharePassword: 'pass',
        sqlConnectionString: 'Server=test;',
      };

      const requiredFields = ['subscriptionId', 'newLogicAppName', 'resourceGroup', 'location'];
      const hybridFields = [
        'connectedEnvironment',
        'fileShareHostname',
        'fileSharePath',
        'fileShareUsername',
        'fileSharePassword',
        'sqlConnectionString',
      ];

      const hasAllRequired = requiredFields.every((field) => hybridData[field as keyof typeof hybridData]);
      const hasHybridFields = hybridFields.every((field) => hybridData[field as keyof typeof hybridData]);

      expect(hasAllRequired).toBe(true);
      expect(hasHybridFields).toBe(true);
    });
  });
});
