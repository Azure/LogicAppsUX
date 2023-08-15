export const webviewType = 'dataMapperWebview';
export const outputChannelTitle = 'Data Mapper';
export const outputChannelPrefix = 'azureLogicAppsDataMapper';

export const supportedDataMapDefinitionFileExts = ['.yml'];
export const supportedSchemaFileExts = ['.xsd', '.json'];
export const supportedCustomXsltFileExts = ['.xslt'];

const artifactsPath = '/Artifacts/';
export const schemasPath = `${artifactsPath}/Schemas`;
export const customXsltPath = `${artifactsPath}/DataMapper/Extensions/InlineXslt`;
export const dataMapsPath = `${artifactsPath}/Maps`;
export const dataMapDefinitionsPath = `${artifactsPath}/MapDefinitions`;
export const workflowDesignTimeDir = '/workflow-designtime';

export const defaultDataMapFilename = 'default';
export const draftMapDefinitionSuffix = '.draft';
export const mapDefinitionExtension = '.yml';
export const mapXsltExtension = '.xslt';

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
    FUNCTIONS_WORKER_RUNTIME: 'dotnet-isolated',
    ProjectDirectoryPath: 'should/be/set/by/code',
  },
};

export const backendRuntimeBaseUrl = 'http://localhost:';
export const workflowMgmtApi = '/runtime/webhooks/workflow/api/management/';
export const backendRuntimeTimeout = 60000;
