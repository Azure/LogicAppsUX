import {
  getFileNameAndPath,
  getSelectedSchema,
  type DataMapDataProviderProps,
  type IDataMapperApiService,
  type IDataMapperFileService,
  type SchemaFile,
} from '@microsoft/logic-apps-data-mapper-v2';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { request, requestAfterWrites, write } from './rpc';

type UpdateData = (update: Partial<DataMapDataProviderProps>) => void;

function schemaPath(schemaName: string, schemaFilePath: string): string {
  const normalized = schemaFilePath.replaceAll('\\', '/');
  if (normalized === schemaName || normalized.endsWith(`/${schemaName}`)) {
    return normalized;
  }
  return `${normalized}${normalized && !normalized.endsWith('/') ? '/' : ''}${schemaName}`;
}

export const apiService: IDataMapperApiService = {
  getFunctionsManifest: () => request('getFunctionsManifest'),
  getSchemaFile: (schemaName, schemaFilePath) =>
    request('getSchemaFile', { schemaName, schemaFilePath: schemaPath(schemaName, schemaFilePath) }),
  generateDataMapXslt: (dataMapDefinition) => requestAfterWrites('generateDataMapXslt', { dataMapDefinition }),
  testDataMap: (dataMapXsltFilename, schemaInputValue) => requestAfterWrites('testDataMap', { dataMapXsltFilename, schemaInputValue }),
  getSchemaFileUri: (schemaFilename, schemaFilePath) => `lml-schema:${encodeURIComponent(schemaFilePath + schemaFilename)}`,
};

export function fileItems(paths: string[]): NonNullable<DataMapDataProviderProps['availableSchemas']> {
  return paths.map((fullPath) => {
    const [name] = getFileNameAndPath(fullPath);
    return { name, fullPath, type: 'file' as const };
  });
}

export function createFileService(
  update: UpdateData,
  onError: (error: unknown) => void,
  onSave: (definition: string, metadata: string) => () => void = () => () => undefined
): IDataMapperFileService {
  const run = (operation: Promise<unknown>) => {
    operation.catch(onError);
  };
  const addSchema = async (selected: SchemaFile) => {
    const [schemaName, schemaFilePath] = getFileNameAndPath(selected.path);
    const schema = await getSelectedSchema(schemaName, schemaFilePath);
    update(selected.type === SchemaType.Source ? { sourceSchema: schema } : { targetSchema: schema });
  };
  return {
    getSchemaFromFile: (schemaType) => {
      run(request<SchemaFile | undefined>('selectSchema', { schemaType }).then((selected) => selected && addSchema(selected)));
    },
    addSchemaFromFile: (selected) => run(addSchema(selected)),
    saveMapDefinitionCall: (dataMapDefinition, mapMetadata) => {
      const saved = onSave(dataMapDefinition, mapMetadata);
      run(write('saveMapDefinition', { dataMapDefinition, mapMetadata }).then(saved));
    },
    saveDraftStateCall: (dataMapDefinition) => run(write('saveDraftState', { dataMapDefinition })),
    saveXsltCall: (xslt) => run(write('saveXslt', { xslt }).then(() => update({ xsltContent: xslt }))),
    readCurrentSchemaOptions: () => {
      run(request<string[]>('readSchemas').then((paths) => update({ availableSchemas: fileItems(paths) })));
    },
    readCurrentCustomXsltPathOptions: () => {
      run(request<string[]>('readCustomXsltPaths').then((paths) => update({ customXsltPaths: fileItems(paths) })));
    },
    sendNotification: (title, text, level) => run(request('notify', { title, text, level })),
    isTestDisabledForOS: () => undefined,
  };
}
