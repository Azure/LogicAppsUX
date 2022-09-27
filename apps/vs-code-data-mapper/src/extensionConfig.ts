export const webviewTitle = 'Data Mapper';
export const outputChannelTitle = webviewTitle;

export const supportedDataMapFileExts = ['.yml'];
export const supportedSchemaFileExts = ['.xsd'];

const artifactsPath = '/Artifacts/';
export const schemasPath = `${artifactsPath}/Schemas`;
export const dataMapsPath = `${artifactsPath}/Maps`;
export const dataMapDefinitionsPath = `${artifactsPath}/MapDefinitions`;

export const hostFileName = 'host.json';
export const settingsFileName = 'local.settings.json';
export const hostFileContent = {
  version: '2.0',
  extensionBundle: {
    id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
    version: '[1.*, 2.0.0)',
  },
  extensions: {
    workflow: {
      settings: {
        'Runtime.WorkflowOperationDiscoveryHostMode': 'true',
      },
    },
  },
};
export const settingsFileContent = {
  IsEncrypted: false,
  Values: {
    AzureWebJobsSecretStorageType: 'Files',
    FUNCTIONS_WORKER_RUNTIME: 'node',
  },
};

export const backendRuntimeBaseUrl = 'http://localhost:7071';
export const workflowMgmtApi = '/runtime/webhooks/workflow/api/management/';
export const backendRuntimeTimeout = 60000;
