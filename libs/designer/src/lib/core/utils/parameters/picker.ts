import type { ConnectionReference } from '../../..';
import constants from '../../../common/constants';
import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import { updatePickerInfo } from '../../state/operation/operationMetadataSlice';
import { OperationManifestService } from '@microsoft/designer-client-services-logic-apps';
import type { ParameterInfo, PickerCallbackHandler, PickerInfo, PickerItemInfo, PickerTitleInfo } from '@microsoft/designer-ui';
import { PickerType } from '@microsoft/designer-ui';
import type { InputParameter } from '@microsoft/parsers-logic-apps';
import { isDynamicTreeExtension, isLegacyDynamicValuesExtension } from '@microsoft/parsers-logic-apps';
import { guid } from '@microsoft/utils-logic-apps';
import type { Dispatch } from '@reduxjs/toolkit';

export interface FolderBrowseInfo {
  operationId?: string;
  inputParameters?: Record<string, ParameterInfo>; // sample data - { parameterKey: ParameterInfo }
  referenceParameters?: Record<string, any>; // sample data - { parameterKey: constant/parameter reference }
}

export interface BrowseMetadata {
  rootFolderInfo: FolderBrowseInfo;
  selectFolderInfo: FolderBrowseInfo;
  collectionProperty: string;
  titleProperty: string;
  folderProperty: string;
  mediaProperty: string;
  dynamicState?: any;
}

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
  displayNameResult: string,
  operationInfo: NodeOperation,
  connectionReference: ConnectionReference,
  dispatch: Dispatch
): PickerCallbackHandler => {
  // console.log(nodeId, groupId, parameter, connectionReference);
  const handleShowPicker = () => {
    if (!parameter.pickerInfo) return;
    const titleSegments: PickerTitleInfo[] = [createTitleSegment({ isRoot: true, title: displayNameResult })];
    dispatch(
      updatePickerInfo({
        nodeId,
        groupId,
        parameterId: parameter.id,
        pickerInfo: { ...parameter.pickerInfo, titleSegments, isLoading: true },
      })
    );
  };

  const handleFetchPickerItems = async () => {
    // const browseMetadata = getBrowseMetadataForParameter(parameter);
    const pickerInfo = getPickerInfoForParameter(parameter);
    const pickerItems: PickerItemInfo[] = [];
    const getFolderItemsPromise = OperationManifestService().isSupported(operationInfo.type, operationInfo.kind)
      ? await getFolderItemsUsingInvokeOperationEndpoint()
      : await getFolderItemsForPickerUsingSwagger();

    console.log('fetching', pickerItems, getFolderItemsPromise);
  };

  return {
    onShowPicker: handleShowPicker,
    onFolderNavigated: handleFolderNavigated,
    onTitleSelected: handleTitleSelected,
    fetchPickerItems: handleFetchPickerItems,
  };
};

const getPickerInfoForParameter = (parameter: ParameterInfo): BrowseMetadata | null => {
  const parameterDynamicTree = parameter.pickerInfo?.dynamicTree;
  if (parameterDynamicTree) {
    return {
      rootFolderInfo: {
        referenceParameters: parameterDynamicTree.open.parameters,
      },
      selectFolderInfo: {
        referenceParameters: parameterDynamicTree.browse.parameters,
      },
      collectionProperty: '',
      titleProperty: '',
      folderProperty: '',
      mediaProperty: '',
      dynamicState: parameterDynamicTree.dynamicState,
    };
  } else return null;
};

// const getBrowseMetadataForParameter = (parameter: ParameterInfo) => {
//   if (!parameter.pickerInfo) return;
//   const parameterDynamicTree = parameter.pickerInfo.dynamicTree;
//   if (parameterDynamicTree) {
//     return {
//       rootFolderInfo: {
//         referenceParameters: parameterDynamicTree.open.parameters,
//       },
//       selectFolderInfo: {
//         referenceParameters: parameterDynamicTree.browse.parameters,
//       },
//       collectionProperty: null,
//       titleProperty: null,
//       folderProperty: null,
//       mediaProperty: null,
//       dynamicState: parameterDynamicTree.dynamicState,
//     };
//   } else {

//   }
// };

const getFolderItemsUsingInvokeOperationEndpoint = async () => {
  console.log('getFolderItemsUsingInvokeOperationEndpoint');
  Promise.resolve({});
};

const getFolderItemsForPickerUsingSwagger = async () => {
  console.log('getFolderItemsForPickerUsingSwagger');
  Promise.resolve({});
};

const createTitleSegment = (selectedFolder: any): PickerTitleInfo => {
  return {
    titleKey: guid(),
    isRoot: selectedFolder.isRoot,
    title: selectedFolder.title,
    value: selectedFolder.value,
    dynamicState: selectedFolder.dynamicState,
  };
};

const handleFolderNavigated = () => {
  console.log('handleFolderNavigated');
};

const handleTitleSelected = () => {
  console.log('handleTitleSelected');
};
