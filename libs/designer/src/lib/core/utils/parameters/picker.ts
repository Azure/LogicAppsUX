import type { ConnectionReference } from '../../..';
import constants from '../../../common/constants';
import type { NodeOperation } from '../../state/operation/operationMetadataSlice';
import type { ParameterInfo, PickerCallbackHandler } from '@microsoft/designer-ui';
import type { InputParameter } from '@microsoft/parsers-logic-apps';
import { isDynamicTreeExtension, isLegacyDynamicValuesExtension } from '@microsoft/parsers-logic-apps';
import type { Dispatch } from '@reduxjs/toolkit';

export interface FolderBrowseInfo {
  operationId?: string;
  inputParameters?: Record<string, ParameterInfo>; // sample data - { parameterKey: ParameterInfo }
  referenceParameters?: Record<string, any>; // sample data - { parameterKey: constant/parameter reference }
}

export const requiresFilePickerEditor = (parameter: InputParameter) => {
  const { dynamicValues } = parameter;
  return (
    dynamicValues &&
    ((isLegacyDynamicValuesExtension(dynamicValues) && dynamicValues?.extension?.capability === constants.PROPERTY.FILE_PICKER) ||
      isDynamicTreeExtension(dynamicValues))
  );
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
  console.log('getFilePickerCallbacks', nodeId, groupId, parameter, displayNameResult, operationInfo, connectionReference, dispatch);

  return {
    onOpenPicker: handleShowPicker,
    onFolderNavigated: handleFolderNavigated,
    getValueFromSelectedItem: getValueFromSelectedItem,
  };
};

const handleShowPicker = () => {
  throw new Error('Function not implemented.');
};

function handleFolderNavigated(): void {
  throw new Error('Function not implemented.');
}
function getValueFromSelectedItem(input: any): string {
  console.log(input);
  throw new Error('Function not implemented.');
}
