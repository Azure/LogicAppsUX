import { getReactQueryClient } from '../ReactQueryProvider';
import type {
  ListDynamicValue,
  ManagedIdentityRequestProperties,
  TreeDynamicExtension,
  TreeDynamicValue,
} from '@microsoft/logic-apps-shared';
import { ConnectorService } from '@microsoft/logic-apps-shared';
import type { FilePickerInfo, LegacyDynamicSchemaExtension, LegacyDynamicValuesExtension, OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { Types, getPropertyValue, equals, getJSONValue, getObjectPropertyValue, isNullOrUndefined } from '@microsoft/logic-apps-shared';

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

  const values = getObjectPropertyValue(response, extension['value-collection'] ? extension['value-collection'].split('/') : []);
  if (values && values.length) {
    return values.map((property: any) => {
      let value: any, displayName: any;
      let isSelectable = true;

      if (parameterArrayType && parameterArrayType !== Types.Object) {
        displayName = value = getJSONValue(property);
      } else {
        value = getObjectPropertyValue(property, extension['value-path'].split('/'));
        displayName = extension['value-title'] ? getObjectPropertyValue(property, extension['value-title'].split('/')) : value;
      }

      const description = extension['value-description']
        ? getObjectPropertyValue(property, extension['value-description'].split('/'))
        : undefined;

      if (extension['value-selectable']) {
        const selectableValue = getObjectPropertyValue(property, extension['value-selectable'].split('/'));
        if (!isNullOrUndefined(selectableValue)) {
          isSelectable = selectableValue;
        }
      }

      return { value, displayName, description, disabled: !isSelectable };
    });
  }

  return response;
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

  const schemaPath = extension['value-path'] ? extension['value-path'].split('/') : undefined;
  return schemaPath
    ? getObjectPropertyValue(
        response,
        schemaPath.length && equals(schemaPath[schemaPath.length - 1], 'properties') ? schemaPath.splice(-1, 1) : schemaPath
      ) ?? null
    : { properties: response, type: Types.Object };
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
  const values = collectionPath ? getPropertyValue(response, collectionPath) : response;

  if (values && values.length) {
    return values.map((value: any) => {
      return {
        value,
        displayName: getPropertyValue(value, titlePath as string),
        isParent: !!getPropertyValue(value, folderPropertyPath as string),
        mediaType: mediaPropertyPath ? getPropertyValue(value, mediaPropertyPath) : undefined,
      };
    });
  }

  return response;
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
