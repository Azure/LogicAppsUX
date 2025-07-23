import {
  ArrayEditor,
  AuthenticationEditor,
  type AuthenticationEditorOptions,
  type ChangeState,
  Combobox,
  DictionaryEditor,
  DropdownEditor,
  DynamicLoadStatus,
  FilePickerEditor,
  getDropdownOptionsFromOptions,
  HTMLEditor,
  mergeClasses,
  SchemaEditor,
  StringEditor,
  TableEditor,
} from '@microsoft/designer-ui';
import { getPropertyValue, replaceWhiteSpaceWithUnderscore, type ParameterInfo, type ValueSegment } from '@microsoft/logic-apps-shared';
import { useEditOperationStyles } from './styles';
import { useCallback } from 'react';
import {
  getDisplayValueFromPickerSelectedItem,
  getValueFromPickerSelectedItem,
  loadDynamicTreeItemsForParameter,
  loadDynamicValuesForParameter,
  parameterValueToStringWithoutCasting,
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

const mcpEditorsPlugin = {
  tokens: false,
};

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

  const onCastParameter = (value: ValueSegment[]): string => {
    return parameterValueToStringWithoutCasting(value);
  };

  const dropdownOptions = getDropdownOptionsFromOptions(parameter.editorOptions);
  const labelForAutomationId = replaceWhiteSpaceWithUnderscore(parameter.label);

  switch (parameter.editor?.toLowerCase()) {
    case constants.EDITOR.ARRAY:
      return (
        <ArrayEditor
          className={mergeClasses('msla-setting-token-editor-container', styles.parameterEditor)}
          labelId={labelForAutomationId}
          arrayType={parameter.editorViewModel.arrayType}
          initialMode={parameter.editorOptions?.initialMode}
          label={parameter.label}
          placeholder={parameter.placeholder}
          initialValue={parameter.value}
          basePlugins={mcpEditorsPlugin}
          itemSchema={parameter.editorViewModel.itemSchema}
          onChange={onValueChange}
          options={dropdownOptions}
          isLoading={parameter.dynamicData?.status === DynamicLoadStatus.LOADING}
          errorDetails={parameter.dynamicData?.error ? { message: parameter.dynamicData.error.message } : undefined}
          onMenuOpen={onComboboxMenuOpen}
          castParameter={onCastParameter}
          dataAutomationId={`msla-setting-token-editor-combobox-${labelForAutomationId}`}
        />
      );

    case constants.EDITOR.AUTHENTICATION:
      return (
        <AuthenticationEditor
          className={mergeClasses('msla-setting-token-editor-container', styles.parameterEditor)}
          labelId={labelForAutomationId}
          initialValue={parameter.value}
          options={parameter.editorOptions as AuthenticationEditorOptions}
          type={parameter.editorViewModel.type}
          authenticationValue={parameter.editorViewModel.authenticationValue}
          onChange={onValueChange}
          basePlugins={mcpEditorsPlugin}
        />
      );

    case constants.EDITOR.DICTIONARY:
      return (
        <DictionaryEditor
          className={mergeClasses('msla-setting-token-editor-container', styles.parameterEditor)}
          labelId={labelForAutomationId}
          label={parameter.label}
          placeholder={parameter.placeholder}
          basePlugins={mcpEditorsPlugin}
          readonly={parameter.editorOptions?.readOnly}
          initialValue={parameter.value}
          initialItems={parameter.editorViewModel.items}
          valueType={parameter.editorOptions?.valueType}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-dictionaryeditor-${labelForAutomationId}`}
        />
      );

    case constants.EDITOR.DROPDOWN:
      return (
        <DropdownEditor
          className={styles.parameterEditor}
          label={parameter.label}
          initialValue={parameter.value}
          options={dropdownOptions.map((option: any, index: number) => ({
            key: index.toString(),
            ...option,
          }))}
          placeholder={parameter.placeholder}
          multiSelect={!!getPropertyValue(parameter.editorOptions, 'multiSelect')}
          serialization={parameter.editorOptions?.serialization}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-dropdowneditor-${labelForAutomationId}`}
        />
      );

    case constants.EDITOR.COMBOBOX:
      return (
        <Combobox
          className={mergeClasses('msla-setting-token-editor-container', styles.parameterEditor)}
          labelId={labelForAutomationId}
          label={parameter.label}
          placeholder={parameter.placeholder}
          basePlugins={mcpEditorsPlugin}
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
          className={mergeClasses('msla-setting-token-editor-container', styles.parameterEditor)}
          labelId={labelForAutomationId}
          placeholder={parameter.placeholder}
          basePlugins={{ ...mcpEditorsPlugin, clearEditor: true }}
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

    case constants.EDITOR.HTML:
      return (
        <HTMLEditor
          className={styles.parameterEditor}
          labelId={labelForAutomationId}
          initialValue={parameter.value}
          placeholder={parameter.placeholder}
          basePlugins={mcpEditorsPlugin}
          onChange={onValueChange}
          valueType={constants.SWAGGER.TYPE.ANY}
          dataAutomationId={`msla-setting-token-editor-htmleditor-${labelForAutomationId}`}
        />
      );

    case constants.EDITOR.SCHEMA:
      return (
        <SchemaEditor className={styles.parameterEditor} label={parameter.label} initialValue={parameter.value} onChange={onValueChange} />
      );

    case constants.EDITOR.TABLE:
      return (
        <TableEditor
          className={styles.parameterEditor}
          labelId={labelForAutomationId}
          initialValue={parameter.value}
          initialItems={parameter.editorViewModel.items}
          columnMode={parameter.editorViewModel.columnMode}
          columns={parameter.editorOptions?.columns?.count}
          titles={parameter.editorOptions?.columns?.titles}
          keys={parameter.editorOptions?.columns?.keys}
          types={parameter.editorOptions?.columns?.types}
          onChange={onValueChange}
          dataAutomationId={`msla-setting-token-editor-tableditor-${labelForAutomationId}`}
        />
      );

    default:
      return (
        <StringEditor
          className={mergeClasses('msla-setting-token-editor-container', styles.parameterEditor)}
          basePlugins={mcpEditorsPlugin}
          initialValue={parameter.value}
          onChange={onParameterVisibilityUpdate}
          editorBlur={onValueChange}
          placeholder={parameter.placeholder ?? `Enter ${parameter.label?.toLowerCase()}`}
        />
      );
  }
};
