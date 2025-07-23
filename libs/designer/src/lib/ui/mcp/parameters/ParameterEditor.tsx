import {
  type ChangeState,
  Combobox,
  DynamicLoadStatus,
  FilePickerEditor,
  getDropdownOptionsFromOptions,
  mergeClasses,
  StringEditor,
} from '@microsoft/designer-ui';
import { getPropertyValue, replaceWhiteSpaceWithUnderscore, type ParameterInfo, type ValueSegment } from '@microsoft/logic-apps-shared';
import { useEditOperationStyles } from './styles';
import { useCallback } from 'react';
import {
  getDisplayValueFromPickerSelectedItem,
  getValueFromPickerSelectedItem,
  loadDynamicTreeItemsForParameter,
  loadDynamicValuesForParameter,
  updateParameterAndDependencies,
} from '../../../core/utils/parameters/helper';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import constants from '../../../common/constants';
import { useConnectorName } from '../../../core/state/selectors/actionMetadataSelector';

interface ParameterEditorProps {
  operationId: string;
  groupId: string;
  parameter: ParameterInfo;
  onParameterVisibilityUpdate: () => void;
  handleParameterValueChange: (parameterId: string, newValue: ValueSegment[]) => void;
}

export const ParameterEditor = ({
  operationId,
  groupId,
  parameter,
  onParameterVisibilityUpdate,
  handleParameterValueChange,
}: ParameterEditorProps) => {
  const styles = useEditOperationStyles();
  const dispatch = useDispatch<AppDispatch>();
  const { operationInfo, reference, nodeInputs, dependencies } = useSelector((state: RootState) => ({
    operationInfo: state.operation.operationInfo[operationId],
    reference: state.connection.connectionReferences[state.connection.connectionsMapping[operationId] ?? ''],
    nodeInputs: state.operation.inputParameters[operationId],
    dependencies: state.operation.dependencies[operationId],
  }));
  const displayNameResult = useConnectorName(operationInfo);

  const onValueChange = useCallback(
    (newState: ChangeState) => {
      const { value: newValueSegments, viewModel } = newState;
      const propertiesToUpdate = { value: newValueSegments, preservedValue: undefined } as Partial<ParameterInfo>;

      if (viewModel !== undefined) {
        propertiesToUpdate.editorViewModel = viewModel;
      }

      dispatch(
        updateParameterAndDependencies({
          nodeId: operationId,
          groupId,
          parameterId: parameter?.id as string,
          properties: propertiesToUpdate,
          isTrigger: false,
          operationInfo,
          connectionReference: reference,
          nodeInputs,
          dependencies,
        })
      );
      onParameterVisibilityUpdate();
      handleParameterValueChange(parameter.id, newValueSegments);
    },
    [
      dispatch,
      operationId,
      groupId,
      parameter.id,
      operationInfo,
      reference,
      nodeInputs,
      dependencies,
      onParameterVisibilityUpdate,
      handleParameterValueChange,
    ]
  );

  const onComboboxMenuOpen = useCallback((): void => {
    if (parameter?.dynamicData?.status === DynamicLoadStatus.FAILED || parameter?.dynamicData?.status === DynamicLoadStatus.NOTSTARTED) {
      loadDynamicValuesForParameter(
        operationId,
        groupId,
        parameter?.id,
        operationInfo,
        reference,
        nodeInputs,
        dependencies,
        true /* showErrorWhenNotReady */,
        dispatch,
        {},
        {}
      );
    }
  }, [dependencies, dispatch, groupId, nodeInputs, operationId, operationInfo, parameter?.dynamicData?.status, parameter?.id, reference]);

  const getPickerCallbacks = () => ({
    getFileSourceName: () => displayNameResult.result,
    getDisplayValueFromSelectedItem: (selectedItem: any) =>
      getDisplayValueFromPickerSelectedItem(selectedItem, parameter as ParameterInfo, dependencies),
    getValueFromSelectedItem: (selectedItem: any) => getValueFromPickerSelectedItem(selectedItem, parameter as ParameterInfo, dependencies),
    onFolderNavigation: (selectedItem: any | undefined): void => {
      loadDynamicTreeItemsForParameter(
        operationId,
        groupId,
        parameter?.id ?? '',
        selectedItem,
        operationInfo,
        reference,
        nodeInputs,
        dependencies,
        true /* showErrorWhenNotReady */,
        dispatch,
        /* idReplacements */ {},
        /* workflowParameters */ {}
      );
    },
  });

  const dropdownOptions = getDropdownOptionsFromOptions(parameter.editorOptions);
  const labelForAutomationId = replaceWhiteSpaceWithUnderscore(parameter.label);

  switch (parameter.editor?.toLowerCase()) {
    case constants.EDITOR.COMBOBOX:
      return (
        <Combobox
          labelId={labelForAutomationId}
          placeholder={parameter.placeholder}
          basePlugins={{ tokens: false }}
          initialValue={parameter.value}
          options={dropdownOptions}
          useOption={true}
          isLoading={parameter.dynamicData?.status === DynamicLoadStatus.LOADING}
          errorDetails={parameter.dynamicData?.error ? { message: parameter.dynamicData.error.message } : undefined}
          onChange={onValueChange}
          onMenuOpen={onComboboxMenuOpen}
          multiSelect={getPropertyValue(parameter.editorOptions, 'multiSelect')}
          serialization={parameter.editorOptions?.serialization}
          dataAutomationId={`msla-setting-token-editor-combobox-${labelForAutomationId}`}
        />
      );

    case constants.EDITOR.FILEPICKER:
      return (
        <FilePickerEditor
          className="msla-setting-token-editor-container"
          labelId={labelForAutomationId}
          placeholder={parameter.placeholder}
          basePlugins={{ clearEditor: true, tokens: false }}
          initialValue={parameter.value}
          displayValue={parameter.editorViewModel.displayValue}
          type={parameter.editorOptions?.pickerType}
          items={parameter.editorOptions?.items}
          fileFilters={parameter.editorOptions?.fileFilters}
          pickerCallbacks={getPickerCallbacks()}
          isLoading={parameter.dynamicData?.status === DynamicLoadStatus.LOADING}
          errorDetails={parameter.dynamicData?.error ? { message: parameter.dynamicData.error.message } : undefined}
          editorBlur={onValueChange}
          dataAutomationId={`msla-setting-token-editor-filepickereditor-${labelForAutomationId}`}
        />
      );

    default:
      return (
        <StringEditor
          className={mergeClasses('msla-setting-token-editor-container', styles.parameterEditor)}
          basePlugins={{ tokens: false }}
          initialValue={parameter.value}
          onChange={onParameterVisibilityUpdate}
          editorBlur={onValueChange}
          placeholder={parameter.placeholder ?? `Enter ${parameter.label?.toLowerCase()}`}
        />
      );
  }
};
