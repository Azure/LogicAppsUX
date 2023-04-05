import constants from '../../../common/constants';
import type { ParameterChangeEvent, PickerInfo } from '@microsoft/designer-ui';
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
    onShowPicker: handleShowPicker,
    onTitleSelected: handleTitleSelection,
    onFolderNavigated: handleFolderNavigation,
  };
};

function handleShowPicker(_e: ParameterChangeEvent): void {
  throw new Error('Function not implemented.');
}

function handleTitleSelection(_e: ParameterChangeEvent): void {
  throw new Error('Function not implemented.');
}

function handleFolderNavigation(_e: ParameterChangeEvent): void {
  throw new Error('Function not implemented.');
}
