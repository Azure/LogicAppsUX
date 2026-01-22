/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const webviewType = 'dataMapperWebview';

/**
 * @deprecated LML files are being phased out. Use supportedDataMapFileExts instead.
 */
export const supportedDataMapDefinitionFileExts = ['.lml', '.yml'];
/**
 * Primary data map file extensions (XSLT with embedded metadata).
 */
export const supportedDataMapFileExts = ['.xslt'];
export const supportedSchemaFileExts = ['.xsd', '.json'];
export const supportedCustomXsltFileExts = ['.xslt', '.xml'];
export const supportedDataMapperFolders = ['Maps', 'MapDefinitions', 'Schemas'];

const artifactsPath = '/Artifacts/';
export const schemasPath = `${artifactsPath}/Schemas`;
export const customXsltPath = 'Artifacts/DataMapper/Extensions/InlineXslt';
export const customFunctionsPath = 'Artifacts/DataMapper/Extensions/Functions';
export const dataMapsPath = `${artifactsPath}/Maps`;
/**
 * @deprecated MapDefinitions folder is being phased out. Maps are now stored directly in dataMapsPath as XSLT.
 */
export const dataMapDefinitionsPath = `${artifactsPath}/MapDefinitions`;

export const defaultDataMapFilename = 'default';
export const draftMapDefinitionSuffix = '.draft';
/**
 * @deprecated LML extension is being phased out. Use mapXsltExtension instead.
 */
export const mapDefinitionExtension = '.lml';
export const mapXsltExtension = '.xslt';
/**
 * Draft file extension for XSLT files.
 */
export const draftXsltExtension = '.draft.xslt';

export const backendRuntimeBaseUrl = 'http://localhost:';
