import type {
  ISubscription,
  IRegion,
  IIse,
  WorkflowsList,
  IApiService,
  AdvancedOptionsTypes,
  ISummaryData,
} from '../../../../vs-code-react/src/run-service';

// Mock data that mimics real Azure resources
const mockSubscriptions: ISubscription[] = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012',
    subscriptionId: '12345678-1234-1234-1234-123456789012',
    subscriptionName: 'Visual Studio Enterprise',
  },
  {
    id: '/subscriptions/87654321-4321-4321-4321-210987654321',
    subscriptionId: '87654321-4321-4321-4321-210987654321',
    subscriptionName: 'Pay-As-You-Go',
  },
  {
    id: '/subscriptions/11111111-2222-3333-4444-555555555555',
    subscriptionId: '11111111-2222-3333-4444-555555555555',
    subscriptionName: 'Free Trial',
  },
];

const mockRegions: IRegion[] = [
  { name: 'eastus', displayName: 'East US', count: 15 },
  { name: 'westus', displayName: 'West US', count: 8 },
  { name: 'centralus', displayName: 'Central US', count: 12 },
  { name: 'northeurope', displayName: 'North Europe', count: 6 },
  { name: 'westeurope', displayName: 'West Europe', count: 9 },
  { name: 'eastasia', displayName: 'East Asia', count: 4 },
  { name: 'southeastasia', displayName: 'Southeast Asia', count: 7 },
];

const mockISEs: IIse[] = [
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/myRG/providers/Microsoft.Logic/integrationServiceEnvironments/myISE-prod',
    subscriptionId: '12345678-1234-1234-1234-123456789012',
    iseName: 'myISE-prod',
    location: 'eastus',
    resourceGroup: 'myRG',
  },
  {
    id: '/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/testRG/providers/Microsoft.Logic/integrationServiceEnvironments/myISE-test',
    subscriptionId: '12345678-1234-1234-1234-123456789012',
    iseName: 'myISE-test',
    location: 'westus',
    resourceGroup: 'testRG',
  },
];

const mockWorkflows: WorkflowsList[] = [
  { key: 'workflow-1', name: 'OrderProcessing', resourceGroup: 'production-rg' },
  { key: 'workflow-2', name: 'CustomerOnboarding', resourceGroup: 'production-rg' },
  { key: 'workflow-3', name: 'InventoryManagement', resourceGroup: 'logistics-rg' },
  { key: 'workflow-4', name: 'PaymentProcessing', resourceGroup: 'finance-rg' },
  { key: 'workflow-5', name: 'EmailNotifications', resourceGroup: 'communications-rg' },
  { key: 'workflow-6', name: 'DataSynchronization', resourceGroup: 'integration-rg' },
  { key: 'workflow-7', name: 'ReportGeneration', resourceGroup: 'analytics-rg' },
  { key: 'workflow-8', name: 'UserAuthentication', resourceGroup: 'security-rg' },
];

export class MockApiService implements IApiService {
  async getWorkflows(subscriptionId: string, iseId?: string, location?: string): Promise<WorkflowsList[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Filter workflows based on location/ISE if provided
    let filteredWorkflows = mockWorkflows;

    if (location && !iseId) {
      // Filter by region (simulate that different regions have different workflows)
      const regionIndex = mockRegions.findIndex((r) => r.name === location);
      if (regionIndex >= 0) {
        // Return different subset based on region
        filteredWorkflows = mockWorkflows.slice(regionIndex * 2, regionIndex * 2 + 4);
      }
    }

    if (iseId) {
      // Filter by ISE (ISE typically has fewer workflows)
      filteredWorkflows = mockWorkflows.slice(0, 3);
    }

    return filteredWorkflows;
  }

  async getSubscriptions(): Promise<ISubscription[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockSubscriptions;
  }

  async getIse(selectedSubscription: string): Promise<IIse[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Filter ISEs by subscription
    return mockISEs.filter((ise) => ise.subscriptionId === selectedSubscription);
  }

  async getRegions(_subscriptionId: string): Promise<IRegion[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Return all regions for any subscription
    return mockRegions;
  }

  async validateWorkflows(selectedWorkflows: WorkflowsList[]): Promise<any> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock validation response with some warnings and success
    return {
      validationState: 'SucceededWithWarning',
      workflows: selectedWorkflows.reduce((acc, workflow) => {
        acc[workflow.key] = {
          validationState: Math.random() > 0.3 ? 'Succeeded' : 'SucceededWithWarning',
          details: {
            message: 'Workflow validation completed',
            code: 'ValidationSuccess',
          },
          workflowOperations: {
            'HTTP-Action': { status: 'Succeeded', message: 'HTTP action is valid' },
            'Logic-App-Action': { status: 'Warning', message: 'Consider updating API version' },
          },
          connections: {
            azureblob: { status: 'Succeeded', message: 'Azure Blob connection is valid' },
            office365: { status: 'Warning', message: 'Office 365 connection needs re-authentication' },
          },
          parameters: {
            environment: { status: 'Succeeded', message: 'Environment parameter is valid' },
          },
        };
        return acc;
      }, {} as any),
    };
  }

  async exportWorkflows(
    selectedWorkflows: WorkflowsList[],
    selectedSubscription: string,
    selectedLocation: string,
    selectedAdvanceOptions: AdvancedOptionsTypes[]
  ): Promise<ISummaryData> {
    // Simulate network delay for export
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock export response
    return {
      properties: {
        packageLink: {
          downloadUrl: 'https://mock-storage.blob.core.windows.net/exports/logic-app-export-12345.zip',
        },
        details: [
          {
            exportDetailCategory: 'Information',
            exportDetailCode: 'ExportSuccess',
            exportDetailMessage: `Successfully exported ${selectedWorkflows.length} workflows`,
          },
          {
            exportDetailCategory: 'RequiredStep',
            exportDetailCode: 'UpdateConnections',
            exportDetailMessage: 'Update connection strings in the exported workflows',
          },
          {
            exportDetailCategory: 'Information',
            exportDetailCode: 'AdvancedOptions',
            exportDetailMessage: `Applied advanced options: ${selectedAdvanceOptions.join(', ')}`,
          },
        ],
      },
    };
  }
}
