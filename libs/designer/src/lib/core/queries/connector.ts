import { getReactQueryClient } from '../ReactQueryProvider';
import type {
  ListDynamicValue,
  ManagedIdentityRequestProperties,
  TreeDynamicExtension,
  TreeDynamicValue,
  FilePickerInfo,
  LegacyDynamicSchemaExtension,
  LegacyDynamicValuesExtension,
  OpenAPIV2,
} from '@microsoft/logic-apps-shared';
import {
  ConnectorService,
  Types,
  getPropertyValue,
  getJSONValue,
  getObjectPropertyValue,
  isNullOrUndefined,
  LoggerService,
  LogEntryLevel,
  isObject,
  isString,
  guid,
} from '@microsoft/logic-apps-shared';

export const getLegacyDynamicValues = async (
  connectionId: string,
  connectorId: string,
  parameters: Record<string, any>,
  extension: LegacyDynamicValuesExtension,
  parameterArrayType: string,
  managedIdentityProperties?: ManagedIdentityRequestProperties
): Promise<ListDynamicValue[]> => {
  const queryClient = getReactQueryClient();
  const service = ConnectorService();

  const response = await queryClient.fetchQuery(
    [
      'legacydynamicValues',
      connectionId.toLowerCase(),
      connectorId.toLowerCase(),
      extension.operationId?.toLowerCase(),
      getParametersKey(parameters).toLowerCase(),
    ],
    () => service.getLegacyDynamicContent(connectionId, connectorId, parameters, managedIdentityProperties)
  );

  const values = Array.isArray(response)
    ? response
    : getObjectPropertyValue(response, extension['value-collection'] ? extension['value-collection'].split('/') : []);
  let collectionData = values;
  if (!values || !Array.isArray(values)) {
    LoggerService().log({
      level: LogEntryLevel.Warning,
      area: 'getLegacyDynamicValues',
      message: 'Values returned from Legacy dynamic call is not an array',
      args: [
        `connectorId: ${connectorId}`,
        `operationId: ${extension.operationId}`,
        `arrayType: ${parameterArrayType}`,
        `collectionPath: ${extension['value-collection']}`,
        response,
      ],
    });

    if (isNullOrUndefined(response)) {
      return [];
    }

    const possibleCollectionData = values ?? response;
    collectionData = typeof possibleCollectionData === Types.Object ? getFirstArrayProperty(possibleCollectionData) : [];
  }

  return collectionData.map((property: any) => {
    let value: any;
    let displayName: any;
    let isSelectable = true;
    let description: string | undefined;

    if (parameterArrayType && parameterArrayType !== Types.Object) {
      value = parameterArrayType === Types.String ? property.toString() : getJSONValue(property);
      displayName = value.toString();
    } else {
      value = getObjectPropertyValue(property, extension['value-path'] ? extension['value-path'].split('/') : []);
      displayName = (extension['value-title'] ? getObjectPropertyValue(property, extension['value-title'].split('/')) : value)?.toString();

      description = extension['value-description']
        ? getObjectPropertyValue(property, extension['value-description'].split('/'))
        : undefined;

      if (extension['value-selectable']) {
        const selectableValue = getObjectPropertyValue(property, extension['value-selectable'].split('/'));
        if (!isNullOrUndefined(selectableValue)) {
          isSelectable = selectableValue;
        }
      }
    }

    return { value, displayName, description, disabled: !isSelectable };
  });
};

export const getListDynamicValues = async (
  connectionId: string | undefined,
  connectorId: string,
  operationId: string,
  parameters: Record<string, any>,
  dynamicState: any
): Promise<ListDynamicValue[]> => {
  const queryClient = getReactQueryClient();
  const service = ConnectorService();

  return queryClient.fetchQuery(
    [
      'listdynamicvalues',
      (connectionId ?? '').toLowerCase(),
      connectorId.toLowerCase(),
      operationId.toLowerCase(),
      dynamicState.operationId?.toLowerCase(),
      getParametersKey({ ...dynamicState.parameters, ...parameters }),
    ],
    () => service.getListDynamicValues(connectionId, connectorId, operationId, parameters, dynamicState)
  );
};

export const getLegacyDynamicSchema = async (
  connectionId: string,
  connectorId: string,
  parameters: Record<string, any>,
  extension: LegacyDynamicSchemaExtension,
  managedIdentityProperties?: ManagedIdentityRequestProperties
): Promise<OpenAPIV2.SchemaObject | null> => {
  const queryClient = getReactQueryClient();
  const service = ConnectorService();

  const response = await queryClient.fetchQuery(
    [
      'legacydynamicschema',
      connectionId.toLowerCase(),
      connectorId.toLowerCase(),
      extension.operationId?.toLowerCase(),
      getParametersKey(parameters).toLowerCase(),
    ],
    () => service.getLegacyDynamicContent(connectionId, connectorId, parameters, managedIdentityProperties)
  );

  if (!response) {
    return null;
  }

  const schemaPath = extension['value-path'] ? extension['value-path'].split('/').filter((s) => s) : undefined;
  return schemaPath ? (getObjectPropertyValue(response, schemaPath) ?? null) : { properties: response, type: Types.Object };
};

export const getDynamicSchemaProperties = async (
  connectionId: string | undefined,
  connectorId: string,
  operationId: string,
  parameters: Record<string, any>,
  dynamicState: any
): Promise<OpenAPIV2.SchemaObject> => {
  const queryClient = getReactQueryClient();
  const service = ConnectorService();

  return queryClient.fetchQuery(
    [
      'dynamicschemaproperties',
      (connectionId ?? '').toLowerCase(),
      connectorId.toLowerCase(),
      operationId.toLowerCase(),
      dynamicState.extension.operationId?.toLowerCase(),
      getParametersKey({ ...dynamicState.parameters, ...parameters }),
      `isInput:${!!dynamicState?.isInput}`,
    ],
    () => service.getDynamicSchema(connectionId, connectorId, operationId, parameters, dynamicState)
  );
};

export const getLegacyDynamicTreeItems = async (
  connectionId: string,
  connectorId: string,
  operationId: string,
  parameters: Record<string, any>,
  pickerInfo: FilePickerInfo,
  managedIdentityProperties?: ManagedIdentityRequestProperties
): Promise<TreeDynamicValue[]> => {
  const queryClient = getReactQueryClient();
  const service = ConnectorService();

  const response = await queryClient.fetchQuery(
    [
      'legacydynamictreeitems',
      connectionId.toLowerCase(),
      connectorId.toLowerCase(),
      operationId?.toLowerCase(),
      getParametersKey(parameters).toLowerCase(),
    ],
    () => service.getLegacyDynamicContent(connectionId, connectorId, parameters, managedIdentityProperties)
  );

  const { collectionPath, titlePath, folderPropertyPath, mediaPropertyPath } = pickerInfo;
  const values = Array.isArray(response) ? response : collectionPath ? getPropertyValue(response, collectionPath) : response;
  let collectionData = values;

  if (!values || !Array.isArray(values)) {
    LoggerService().log({
      level: LogEntryLevel.Warning,
      area: 'getLegacyDynamicTreeItems',
      message: 'Tree items returned from Legacy dynamic call is not an array',
      args: [`connectorId: ${connectorId}`, `operationId: ${operationId}`, `collectionPath: ${collectionPath}`, response],
    });

    if (isNullOrUndefined(response)) {
      return [];
    }

    const possibleCollectionData = values ?? response;
    collectionData = typeof possibleCollectionData === Types.Object ? getFirstArrayProperty(possibleCollectionData) : [];
  }

  return collectionData.map((value: any): TreeDynamicValue => {
    return {
      value,
      displayName: (getPropertyValue(value, titlePath as string) ?? '').toString(),
      id: getDynamicTreeValueIdFromCollectionDataValue(value),
      isParent: !!getPropertyValue(value, folderPropertyPath as string),
      mediaType: mediaPropertyPath ? getPropertyValue(value, mediaPropertyPath) : undefined,
    };
  });
};

export const getDynamicTreeItems = async (
  connectionId: string,
  connectorId: string,
  operationId: string,
  parameters: Record<string, any>,
  dynamicExtension: TreeDynamicExtension
): Promise<TreeDynamicValue[]> => {
  const queryClient = getReactQueryClient();
  const service = ConnectorService();

  const values = await queryClient.fetchQuery(
    [
      'dynamictreeitems',
      connectionId.toLowerCase(),
      connectorId.toLowerCase(),
      operationId?.toLowerCase(),
      getParametersKey(parameters).toLowerCase(),
      `selectionState:${dynamicExtension.selectionState ? JSON.stringify(dynamicExtension.selectionState) : ''}`,
    ],
    () => service.getTreeDynamicValues(connectionId, connectorId, operationId, parameters, dynamicExtension),
    { cacheTime: 0, staleTime: 0 }
  );

  return values;
};

const getParametersKey = (parameters: Record<string, any>): string => {
  return Object.keys(parameters).reduce(
    (result: string, parameterKey: string) => `${result}, ${parameterKey}-${JSON.stringify(parameters[parameterKey])}`,
    ''
  );
};

const getFirstArrayProperty = (value: any): any[] => {
  for (const key of Object.keys(value)) {
    if (Array.isArray(value[key])) {
      return value[key];
    }
  }

  return [];
};

const getDynamicTreeValueIdFromCollectionDataValue = (value: any): string => {
  const valueId = value && isObject(value) && 'Id' in value && value.Id;
  if (isString(valueId) && valueId.length > 0) {
    return valueId;
  }

  return guid();
};
