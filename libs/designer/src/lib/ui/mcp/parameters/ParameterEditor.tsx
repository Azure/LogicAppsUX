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
  parameterValueToString,
  shouldEncodeParameterValueForOperationBasedOnMetadata,
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
  onParameterValueChange: (newState: ChangeState) => void;
}

const mcpEditorsPlugin = {
  tokens: false,
};

export const ParameterEditor = ({
  operationId,
  groupId,
  parameter,
  onParameterVisibilityUpdate,
  onParameterValueChange,
}: ParameterEditorProps) => {
  const styles = useEditOperationStyles();
  const dispatch = useDispatch<AppDispatch>();
  const { operationInfo, reference, nodeInputs, dependencies } = useSelector((state: RootState) => ({
    operationInfo: state.operations.operationInfo[operationId],
    reference: state.connection.connectionReferences[state.connection.connectionsMapping[operationId] ?? ''],
    nodeInputs: state.operations.inputParameters[operationId],
    dependencies: state.operations.dependencies[operationId],
  }));
  const displayNameResult = useConnectorName(operationInfo);

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
    return (
      parameterValueToString(
        {
          ...parameter,
          value,
        } as ParameterInfo,
        /* isDefinitionValue */ false,
        /* idReplacements */ {},
        shouldEncodeParameterValueForOperationBasedOnMetadata(operationInfo)
      ) ?? ''
    );
  };

  const dropdownOptions = getDropdownOptionsFromOptions(parameter.editorOptions);
  const labelForAutomationId = replaceWhiteSpaceWithUnderscore(parameter.label);
  const editorClassName = mergeClasses('msla-setting-token-editor-container', styles.parameterEditor);

  switch (parameter.editor?.toLowerCase()) {
    case constants.EDITOR.ARRAY:
      return (
        <ArrayEditor
          className={editorClassName}
          labelId={labelForAutomationId}
          arrayType={parameter.editorViewModel.arrayType}
          initialMode={parameter.editorOptions?.initialMode}
          label={parameter.label}
          initialValue={parameter.value}
          basePlugins={mcpEditorsPlugin}
          itemSchema={parameter.editorViewModel.itemSchema}
          onChange={onParameterValueChange}
          options={dropdownOptions}
          onMenuOpen={onComboboxMenuOpen}
          castParameter={onCastParameter}
          dataAutomationId={`msla-setting-token-editor-combobox-${labelForAutomationId}`}
        />
      );

    case constants.EDITOR.AUTHENTICATION:
      return (
        <AuthenticationEditor
          className={editorClassName}
          labelId={labelForAutomationId}
          initialValue={parameter.value}
          options={parameter.editorOptions as AuthenticationEditorOptions}
          type={parameter.editorViewModel.type}
          authenticationValue={parameter.editorViewModel.authenticationValue}
          onChange={onParameterValueChange}
          basePlugins={mcpEditorsPlugin}
        />
      );

    case constants.EDITOR.DICTIONARY:
      return (
        <DictionaryEditor
          className={editorClassName}
          labelId={labelForAutomationId}
          label={parameter.label}
          basePlugins={mcpEditorsPlugin}
          readonly={parameter.editorOptions?.readOnly}
          initialValue={parameter.value}
          initialItems={parameter.editorViewModel.items}
          valueType={parameter.editorOptions?.valueType}
          onChange={onParameterValueChange}
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
          multiSelect={!!getPropertyValue(parameter.editorOptions, 'multiSelect')}
          serialization={parameter.editorOptions?.serialization}
          onChange={onParameterValueChange}
          dataAutomationId={`msla-setting-token-editor-dropdowneditor-${labelForAutomationId}`}
        />
      );

    case constants.EDITOR.COMBOBOX:
      return (
        <Combobox
          className={editorClassName}
          labelId={labelForAutomationId}
          label={parameter.label}
          basePlugins={mcpEditorsPlugin}
          initialValue={parameter.value}
          options={dropdownOptions}
          useOption={true}
          isLoading={parameter.dynamicData?.status === DynamicLoadStatus.LOADING}
          errorDetails={parameter.dynamicData?.error ? { message: parameter.dynamicData.error.message } : undefined}
          onChange={onParameterValueChange}
          onMenuOpen={onComboboxMenuOpen}
          multiSelect={getPropertyValue(parameter.editorOptions, 'multiSelect')}
          serialization={parameter.editorOptions?.serialization}
          dataAutomationId={`msla-setting-token-editor-combobox-${labelForAutomationId}`}
        />
      );

    case constants.EDITOR.FILEPICKER:
      return (
        <FilePickerEditor
          className={editorClassName}
          labelId={labelForAutomationId}
          basePlugins={{ ...mcpEditorsPlugin, clearEditor: true }}
          initialValue={parameter.value}
          displayValue={parameter.editorViewModel.displayValue}
          type={parameter.editorOptions?.pickerType}
          items={parameter.editorOptions?.items}
          fileFilters={parameter.editorOptions?.fileFilters}
          pickerCallbacks={getPickerCallbacks()}
          isLoading={parameter.dynamicData?.status === DynamicLoadStatus.LOADING}
          errorDetails={parameter.dynamicData?.error ? { message: parameter.dynamicData.error.message } : undefined}
          editorBlur={onParameterValueChange}
          dataAutomationId={`msla-setting-token-editor-filepickereditor-${labelForAutomationId}`}
        />
      );

    case constants.EDITOR.HTML:
      return (
        <HTMLEditor
          className={styles.parameterEditor}
          labelId={labelForAutomationId}
          initialValue={parameter.value}
          basePlugins={mcpEditorsPlugin}
          onChange={onParameterValueChange}
          valueType={constants.SWAGGER.TYPE.ANY}
          dataAutomationId={`msla-setting-token-editor-htmleditor-${labelForAutomationId}`}
        />
      );

    case constants.EDITOR.SCHEMA:
      return (
        <SchemaEditor
          className={styles.parameterEditor}
          label={parameter.label}
          initialValue={parameter.value}
          onChange={onParameterValueChange}
        />
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
          onChange={onParameterValueChange}
          dataAutomationId={`msla-setting-token-editor-tableditor-${labelForAutomationId}`}
        />
      );

    default:
      return (
        <StringEditor
          className={editorClassName}
          basePlugins={mcpEditorsPlugin}
          initialValue={parameter.value}
          onChange={onParameterVisibilityUpdate}
          editorBlur={onParameterValueChange}
        />
      );
  }
};
