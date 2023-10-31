export const webviewType = 'dataMapperWebview';

export const supportedDataMapDefinitionFileExts = ['.yml'];
export const supportedSchemaFileExts = ['.xsd', '.json'];
export const supportedCustomXsltFileExts = ['.xslt', '.xml'];

const artifactsPath = '/Artifacts/';
export const schemasPath = `${artifactsPath}/Schemas`;
export const customXsltPath = `${artifactsPath}/DataMapper/Extensions/InlineXslt`;
export const dataMapsPath = `${artifactsPath}/Maps`;
export const dataMapDefinitionsPath = `${artifactsPath}/MapDefinitions`;

export const defaultDataMapFilename = 'default';
export const draftMapDefinitionSuffix = '.draft';
export const mapDefinitionExtension = '.yml';
export const mapXsltExtension = '.xslt';

export const settingsFileContent = {
  IsEncrypted: false,
  Values: {
    AzureWebJobsSecretStorageType: 'Files',
    FUNCTIONS_WORKER_RUNTIME: 'dotnet-isolated',
    ProjectDirectoryPath: 'should/be/set/by/code',
  },
};

export const backendRuntimeBaseUrl = 'http://localhost:';
export const dataMapLoadTimeout = 60000;
