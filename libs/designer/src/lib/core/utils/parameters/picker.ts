import type { ConnectionReference } from '../../..';
import constants from '../../../common/constants';
import type {
  ParameterInfo,
  PickerCallbackHandler,
  /*PrameterChangeEvent, */
  PickerInfo,
} from '@microsoft/designer-ui';
import { PickerType } from '@microsoft/designer-ui';
import type { InputParameter } from '@microsoft/parsers-logic-apps';
import { isDynamicTreeExtension, isLegacyDynamicValuesExtension } from '@microsoft/parsers-logic-apps';

export const requiresFilePickerEditor = (parameter: InputParameter) => {
  const { dynamicValues } = parameter;
  return (
    dynamicValues &&
    ((isLegacyDynamicValuesExtension(dynamicValues) && dynamicValues?.extension?.capability === constants.PROPERTY.FILE_PICKER) ||
      isDynamicTreeExtension(dynamicValues))
  );
};

export const getFilePickerInfo = (parameter: InputParameter): PickerInfo | undefined => {
  console.log(parameter);
  const dynamicValues = parameter?.dynamicValues;
  if (!dynamicValues) return undefined;
  const legacyDynamicValues = isLegacyDynamicValuesExtension(dynamicValues) ? dynamicValues : null;
  const dynamicTree = isDynamicTreeExtension(dynamicValues) ? dynamicValues : null;
  const pickerProperties = legacyDynamicValues ? legacyDynamicValues.extension.parameters : undefined;
  const isFolder = (dynamicTree && dynamicTree.extension.settings.canSelectParentNodes) || (pickerProperties && pickerProperties.isFolder);
  const type = isFolder ? constants.FILEPICKER_TYPE.FOLDER : constants.FILEPICKER_TYPE.FILE;

  const fileFilters = pickerProperties ? pickerProperties.fileFilter : ([] as string[]);

  const valuePath = legacyDynamicValues ? legacyDynamicValues.extension['value-path'] : undefined;
  return {
    errorMessage: '',
    fileFilters,
    pickerItems: [],
    pickerProperties,
    pickerType: dynamicTree ? PickerType.Invoke : PickerType.SwaggerConstructed,
    titleSegments: [],
    dynamicTree: dynamicTree ? dynamicTree.extension : undefined,
    type,
    valuePath,
  };
};

export const getFilePickerCallbacks = (
  nodeId: string,
  groupId: string,
  parameter: ParameterInfo,
  connectionReference: ConnectionReference
): PickerCallbackHandler => {
  console.log(nodeId, groupId, parameter, connectionReference);
  const handleShowPicker = () => {
    // const titleSegments = [createTitleSegments({isRoot: true, title: getFileSourceName()})]
    console.log(getFileSourceName());
    console.log('handleShowPicker');
  };

  const getFileSourceName = (): string => {
    // const fileSourceId = getFileSourceProviderId();
    return '';
    // return this.context.ConnectorStore.getConnectorDisplayName(fileSourceId);
  };

  // const getFileSourceProviderId = (): string => {
  //   const connectionId = connectionReference?.connection?.id ?? '';
  //   return (
  //     this.context.ConnectionsStore.getFileSourceIdForConnection(connectionId) ||
  //     // TODO: Remove this when RP implements the getConnections call with connection parameters
  //     this.context.GraphStore.getConnectorId(this.nodeId)
  // );
  // }

  // const createTitleSegments =(selectedFolder: any) => {

  // }

  return {
    onShowPicker: () => handleShowPicker(),
    onFolderNavigated: handleFolderNavigated,
    onTitleSelected: handleTitleSelected,
  };
};

const handleFolderNavigated = () => {
  console.log('handleFolderNavigated');
};

const handleTitleSelected = () => {
  console.log('handleTitleSelected');
};
