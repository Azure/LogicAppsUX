export const webviewType = 'dataMapperWebview';

export const supportedDataMapDefinitionFileExts = ['.lml', '.yml'];
export const supportedSchemaFileExts = ['.xsd', '.json'];
export const supportedCustomXsltFileExts = ['.xslt', '.xml'];
export const supportedDataMapperFolders = ['Maps', 'MapDefinitions', 'Schemas'];

const artifactsPath = '/Artifacts/';
export const schemasPath = `${artifactsPath}/Schemas`;
export const customXsltPath = `${artifactsPath}/DataMapper/Extensions/InlineXslt`;
export const dataMapsPath = `${artifactsPath}/Maps`;
export const dataMapDefinitionsPath = `${artifactsPath}/MapDefinitions`;

export const defaultDataMapFilename = 'default';
export const draftMapDefinitionSuffix = '.draft';
export const mapDefinitionExtension = '.lml';
export const mapXsltExtension = '.xslt';

export const backendRuntimeBaseUrl = 'http://localhost:';
