import { TextField } from '@fluentui/react';
import type { ChangeState } from '@microsoft/designer-ui';
import { Combobox, DynamicLoadStatus, FilePickerEditor, getDropdownOptionsFromOptions } from '@microsoft/designer-ui';
import { type ParameterInfo, getPropertyValue, replaceWhiteSpaceWithUnderscore, type Template, equals } from '@microsoft/logic-apps-shared';
import type { NodeDependencies, NodeInputs, NodeOperation } from '../../../core/state/operation/operationMetadataSlice';
import { useConnectorName } from '../../../core/state/selectors/actionMetadataSelector';
import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useConnectionReferenceForKey } from '../../../core/state/templates/templateselectors';
import {
  getDisplayValueFromPickerSelectedItem,
  getParameterFromId,
  getValueFromPickerSelectedItem,
  loadDynamicTreeItemsForParameter,
  loadDynamicValuesForParameter,
  parameterValueToStringWithoutCasting,
  updateParameterAndDependencies,
} from '../../../core/utils/parameters/helper';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const ParameterEditor = ({
  item,
  onChange,
  error,
}: { item: Template.ParameterDefinition; onChange: (newItem: Template.ParameterDefinition) => void; error?: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { value, dynamicData, displayName, associatedOperationParameter } = item;
  const operationId = associatedOperationParameter?.operationId;
  const { dependencies, parameter, nodeInputs, operationInfo } = useSelector((state: RootState) => {
    if (!associatedOperationParameter || !operationId || !state.operation.inputParameters[operationId]) {
      return {};
    }

    return {
      operationInfo: state.operation.operationInfo[operationId],
      nodeInputs: state.operation.inputParameters[operationId],
      parameter: getParameterFromId(state.operation.inputParameters[operationId], associatedOperationParameter.parameterId),
      dependencies: state.operation.dependencies[operationId],
    };
  });
  const connectionReference = useConnectionReferenceForKey(dynamicData?.connection ?? '');
  const displayNameResult = useConnectorName(operationInfo as NodeOperation);
  const hasValidConnection = useMemo(
    () => !dynamicData?.connection || (dynamicData?.connection && connectionReference?.connection?.id),
    [connectionReference, dynamicData?.connection]
  );

  const onValueChange = useCallback(
    (newState: ChangeState) => {
      const { value: newValueSegments, viewModel } = newState;
      const propertiesToUpdate = { value: newValueSegments, preservedValue: undefined } as Partial<ParameterInfo>;

      if (viewModel !== undefined) {
        propertiesToUpdate.editorViewModel = viewModel;
      }

      dispatch(
        updateParameterAndDependencies({
          nodeId: operationId as string,
          groupId: 'default',
          parameterId: parameter?.id as string,
          properties: propertiesToUpdate,
          isTrigger: false,
          operationInfo: operationInfo as NodeOperation,
          connectionReference,
          nodeInputs: nodeInputs as NodeInputs,
          dependencies: dependencies as NodeDependencies,
        })
      );
      onChange({ ...item, value: parameterValueToStringWithoutCasting(newValueSegments) });
    },
    [dispatch, operationId, parameter?.id, operationInfo, connectionReference, nodeInputs, dependencies, onChange, item]
  );

  const onComboboxMenuOpen = useCallback((): void => {
    if (parameter?.dynamicData?.status === DynamicLoadStatus.FAILED || parameter?.dynamicData?.status === DynamicLoadStatus.NOTSTARTED) {
      loadDynamicValuesForParameter(
        operationId as string,
        'default',
        parameter?.id,
        operationInfo as NodeOperation,
        connectionReference,
        nodeInputs as NodeInputs,
        dependencies as NodeDependencies,
        true /* showErrorWhenNotReady */,
        dispatch,
        {},
        {}
      );
    }
  }, [connectionReference, dependencies, dispatch, nodeInputs, operationId, operationInfo, parameter?.dynamicData?.status, parameter?.id]);

  const getPickerCallbacks = () => ({
    getFileSourceName: () => displayNameResult.result,
    getDisplayValueFromSelectedItem: (selectedItem: any) =>
      getDisplayValueFromPickerSelectedItem(selectedItem, parameter as ParameterInfo, dependencies as NodeDependencies),
    getValueFromSelectedItem: (selectedItem: any) =>
      getValueFromPickerSelectedItem(selectedItem, parameter as ParameterInfo, dependencies as NodeDependencies),
    onFolderNavigation: (selectedItem: any | undefined): void => {
      loadDynamicTreeItemsForParameter(
        operationId as string,
        'default',
        parameter?.id ?? '',
        selectedItem,
        operationInfo as NodeOperation,
        connectionReference,
        nodeInputs as NodeInputs,
        dependencies as NodeDependencies,
        true /* showErrorWhenNotReady */,
        dispatch,
        /* idReplacements */ {},
        /* workflowParameters */ {}
      );
    },
  });

  if (dynamicData && parameter?.editorOptions && hasValidConnection) {
    const labelForAutomationId = replaceWhiteSpaceWithUnderscore(displayName);

    if (equals(dynamicData.type, 'list')) {
      return (
        <Combobox
          labelId={labelForAutomationId}
          basePlugins={{ tokens: false }}
          initialValue={parameter.value}
          options={getDropdownOptionsFromOptions(parameter.editorOptions)}
          useOption={true}
          isLoading={parameter.dynamicData?.status === DynamicLoadStatus.LOADING}
          errorDetails={parameter.dynamicData?.error ? { message: parameter.dynamicData.error.message } : undefined}
          onChange={onValueChange}
          onMenuOpen={onComboboxMenuOpen}
          multiSelect={getPropertyValue(parameter.editorOptions, 'multiSelect')}
          serialization={parameter.editorOptions.serialization}
          dataAutomationId={`msla-setting-token-editor-combobox-${labelForAutomationId}`}
        />
      );
    }

    if (equals(dynamicData.type, 'picker')) {
      return (
        <FilePickerEditor
          className="msla-setting-token-editor-container"
          labelId={labelForAutomationId}
          basePlugins={{ clearEditor: true, tokens: false }}
          initialValue={parameter.value}
          displayValue={parameter.editorViewModel.displayValue}
          type={parameter.editorOptions.pickerType}
          items={parameter.editorOptions.items}
          fileFilters={parameter.editorOptions.fileFilters}
          pickerCallbacks={getPickerCallbacks()}
          isLoading={parameter.dynamicData?.status === DynamicLoadStatus.LOADING}
          errorDetails={parameter.dynamicData?.error ? { message: parameter.dynamicData.error.message } : undefined}
          editorBlur={onValueChange}
          dataAutomationId={`msla-setting-token-editor-filepickereditor-${labelForAutomationId}`}
        />
      );
    }
  }

  return (
    <TextField
      className="msla-templates-parameters-values"
      data-testid="msla-templates-parameter-value"
      id="msla-templates-parameter-value"
      aria-label={value}
      value={value}
      onChange={(_event, newValue) => onChange({ ...item, value: newValue ?? '' })}
      errorMessage={error}
    />
  );
};
