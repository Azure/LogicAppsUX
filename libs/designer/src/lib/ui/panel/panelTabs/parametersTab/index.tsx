import constants from '../../../../common/constants';
import { useShowIdentitySelector } from '../../../../core/state/connection/connectionSelector';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import type { ParameterGroup } from '../../../../core/state/operation/operationMetadataSlice';
import { ErrorLevel } from '../../../../core/state/operation/operationMetadataSlice';
import { useOperationErrorInfo } from '../../../../core/state/operation/operationSelector';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import {
  useAllowUserToChangeConnection,
  useConnectorName,
  useNodeConnectionName,
  useOperationInfo,
} from '../../../../core/state/selectors/actionMetadataSelector';
import type { VariableDeclaration } from '../../../../core/state/tokensSlice';
import { updateVariableInfo } from '../../../../core/state/tokensSlice';
import { useNodeMetadata, useReplacedIds } from '../../../../core/state/workflow/workflowSelectors';
import type { AppDispatch, RootState } from '../../../../core/store';
import { getConnectionReference } from '../../../../core/utils/connectors/connections';
import { isRootNodeInGraph } from '../../../../core/utils/graph';
import {
  loadDynamicTreeItemsForParameter,
  loadDynamicValuesForParameter,
  parameterValueToString,
  remapValueSegmentsWithNewIds,
  shouldUseParameterInGroup,
  updateParameterAndDependencies,
} from '../../../../core/utils/parameters/helper';
import type { TokenGroup } from '../../../../core/utils/tokens';
import { createValueSegmentFromToken, getExpressionTokenSections, getOutputTokenSections } from '../../../../core/utils/tokens';
import { getAllVariables, getAvailableVariables } from '../../../../core/utils/variables';
import { SettingsSection } from '../../../settings/settingsection';
import type { Settings } from '../../../settings/settingsection';
import { ConnectionDisplay } from './connectionDisplay';
import { IdentitySelector } from './identityselector';
import { MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import { DynamicCallStatus, TokenPicker, TokenType } from '@microsoft/designer-ui';
import type { ChangeState, PanelTab, ParameterInfo, ValueSegment, OutputToken, TokenPickerMode } from '@microsoft/designer-ui';
import { equals, getPropertyValue } from '@microsoft/utils-logic-apps';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const ParametersTab = () => {
  const selectedNodeId = useSelectedNodeId();
  const nodeMetadata = useNodeMetadata(selectedNodeId);
  const inputs = useSelector((state: RootState) => state.operations.inputParameters[selectedNodeId]);
  const { tokenState, workflowParametersState } = useSelector((state: RootState) => ({
    tokenState: state.tokens,
    workflowParametersState: state.workflowParameters,
  }));
  const nodeType = useSelector((state: RootState) => state.operations.operationInfo[selectedNodeId]?.type);
  const readOnly = useReadOnly();

  const connectionName = useNodeConnectionName(selectedNodeId);
  const operationInfo = useOperationInfo(selectedNodeId);
  const showConnectionDisplay = useAllowUserToChangeConnection(operationInfo);
  const showIdentitySelector = useShowIdentitySelector(selectedNodeId);
  const errorInfo = useOperationErrorInfo(selectedNodeId);

  const replacedIds = useReplacedIds();

  const emptyParametersMessage = useIntl().formatMessage({
    defaultMessage: 'No additional information is needed for this step. You will be able to use the outputs in subsequent steps.',
    description: 'Message to show when there are no parameters to author in operation.',
  });

  if (!operationInfo && !nodeMetadata?.subgraphType) {
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} />
      </div>
    );
  }

  const tokenGroup = getOutputTokenSections(selectedNodeId, nodeType, tokenState, workflowParametersState, replacedIds);
  const expressionGroup = getExpressionTokenSections();

  return (
    <>
      {errorInfo ? (
        <MessageBar
          messageBarType={
            errorInfo.level === ErrorLevel.DynamicInputs || errorInfo.level === ErrorLevel.Default
              ? MessageBarType.severeWarning
              : errorInfo.level === ErrorLevel.DynamicOutputs
              ? MessageBarType.warning
              : MessageBarType.error
          }
        >
          {errorInfo.message}
        </MessageBar>
      ) : null}
      {!hasParametersToAuthor(inputs?.parameterGroups ?? {}) ? (
        <MessageBar messageBarType={MessageBarType.info}>{emptyParametersMessage}</MessageBar>
      ) : null}
      {Object.keys(inputs?.parameterGroups ?? {}).map((sectionName) => (
        <div key={sectionName}>
          <ParameterSection
            key={selectedNodeId}
            nodeId={selectedNodeId}
            group={inputs.parameterGroups[sectionName]}
            readOnly={readOnly}
            tokenGroup={tokenGroup}
            expressionGroup={expressionGroup}
          />
        </div>
      ))}
      {operationInfo && connectionName.isLoading === false && showConnectionDisplay ? (
        <ConnectionDisplay connectionName={connectionName.result} nodeId={selectedNodeId} />
      ) : null}
      {showIdentitySelector ? <IdentitySelector nodeId={selectedNodeId} readOnly={!!readOnly} /> : null}
    </>
  );
};

const ParameterSection = ({
  nodeId,
  group,
  readOnly,
  tokenGroup,
  expressionGroup,
}: {
  nodeId: string;
  group: ParameterGroup;
  readOnly: boolean | undefined;
  tokenGroup: TokenGroup[];
  expressionGroup: TokenGroup[];
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [sectionExpanded, setSectionExpanded] = useState<boolean>(false);
  const {
    isTrigger,
    nodeInputs,
    nodeMetadata,
    operationInfo,
    dependencies,
    settings: nodeSettings,
    variables,
    upstreamNodeIds,
    operationDefinition,
    connectionReference,
    idReplacements,
    workflowParameters,
  } = useSelector((state: RootState) => {
    return {
      isTrigger: isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata),
      nodeInputs: state.operations.inputParameters[nodeId],
      nodeMetadata: state.operations.actionMetadata[nodeId],
      operationInfo: state.operations.operationInfo[nodeId],
      dependencies: state.operations.dependencies[nodeId],
      settings: state.operations.settings[nodeId],
      upstreamNodeIds: state.tokens.outputTokens[nodeId]?.upstreamNodeIds,
      variables: state.tokens.variables,
      operationDefinition: state.workflow.newlyAddedOperations[nodeId] ? undefined : state.workflow.operations[nodeId],
      connectionReference: getConnectionReference(state.connections, nodeId),
      idReplacements: state.workflow.idReplacements,
      workflowParameters: state.workflowParameters.definitions,
    };
  });
  const rootState = useSelector((state: RootState) => state);
  const displayNameResult = useConnectorName(operationInfo);

  const onValueChange = useCallback(
    (id: string, newState: ChangeState) => {
      const { value, viewModel } = newState;
      const parameter = nodeInputs.parameterGroups[group.id].parameters.find((param: any) => param.id === id);

      const propertiesToUpdate = { value, preservedValue: undefined } as Partial<ParameterInfo>;

      if (viewModel !== undefined) {
        propertiesToUpdate.editorViewModel = viewModel;
      }
      if (variables[nodeId]) {
        if (parameter?.parameterKey === 'inputs.$.name') {
          dispatch(updateVariableInfo({ id: nodeId, name: value[0]?.value }));
        } else if (parameter?.parameterKey === 'inputs.$.type') {
          dispatch(updateVariableInfo({ id: nodeId, type: value[0]?.value }));
        }
      }

      updateParameterAndDependencies(
        nodeId,
        group.id,
        id,
        propertiesToUpdate,
        isTrigger,
        operationInfo,
        connectionReference,
        nodeInputs,
        nodeMetadata,
        dependencies,
        getAllVariables(variables),
        nodeSettings,
        dispatch,
        rootState,
        operationDefinition
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      nodeId,
      group.id,
      isTrigger,
      operationInfo,
      connectionReference,
      nodeInputs,
      dependencies,
      variables,
      nodeSettings,
      dispatch,
      operationDefinition,
    ]
  );

  const onComboboxMenuOpen = (parameter: ParameterInfo): void => {
    if (parameter.dynamicData?.status === DynamicCallStatus.FAILED || parameter.dynamicData?.status === DynamicCallStatus.NOTSTARTED) {
      loadDynamicValuesForParameter(
        nodeId,
        group.id,
        parameter.id,
        operationInfo,
        connectionReference,
        nodeInputs,
        nodeMetadata,
        dependencies,
        true /* showErrorWhenNotReady */,
        dispatch,
        idReplacements,
        workflowParameters
      );
    }
  };

  const getPickerCallbacks = (parameter: ParameterInfo) => ({
    getFileSourceName: (): string => {
      return displayNameResult.result;
    },
    getDisplayValueFromSelectedItem: (selectedItem: any): string => {
      const dependency = dependencies.inputs[parameter.parameterKey];
      const propertyPath = dependency.filePickerInfo?.fullTitlePath ?? dependency.filePickerInfo?.browse.itemFullTitlePath;
      return getPropertyValue(selectedItem, propertyPath ?? '');
    },
    getValueFromSelectedItem: (selectedItem: any): string => {
      const dependency = dependencies.inputs[parameter.parameterKey];
      const propertyPath = dependency.filePickerInfo?.valuePath ?? dependency.filePickerInfo?.browse.itemValuePath;
      return getPropertyValue(selectedItem, propertyPath ?? '');
    },
    onFolderNavigation: (selectedItem: any | undefined): void => {
      loadDynamicTreeItemsForParameter(
        nodeId,
        group.id,
        parameter.id,
        selectedItem,
        operationInfo,
        connectionReference,
        nodeInputs,
        nodeMetadata,
        dependencies,
        true /* showErrorWhenNotReady */,
        dispatch,
        idReplacements,
        workflowParameters
      );
    },
  });

  const getValueSegmentFromToken = async (
    parameterId: string,
    token: OutputToken,
    addImplicitForeachIfNeeded: boolean,
    addLatestActionName: boolean
  ): Promise<ValueSegment> => {
    return createValueSegmentFromToken(nodeId, parameterId, token, addImplicitForeachIfNeeded, addLatestActionName, rootState, dispatch);
  };

  const getTokenPicker = (
    parameterId: string,
    editorId: string,
    labelId: string,
    tokenPickerMode?: TokenPickerMode,
    editorType?: string,
    isCodeEditor?: boolean,
    closeTokenPicker?: () => void,
    tokenPickerClicked?: (b: boolean) => void,
    tokenClickedCallback?: (token: ValueSegment) => void
  ): JSX.Element => {
    const parameterType =
      editorType ??
      (nodeInputs.parameterGroups[group.id].parameters.find((param) => param.id === parameterId) ?? {})?.type ??
      constants.SWAGGER.TYPE.ANY;
    const supportedTypes: string[] = getPropertyValue(constants.TOKENS, parameterType);

    const filteredTokenGroup = tokenGroup.map((group) => ({
      ...group,
      tokens: group.tokens.filter((token: OutputToken) => {
        if (isCodeEditor) {
          return !(
            token.outputInfo.type === TokenType.VARIABLE ||
            token.outputInfo.type === TokenType.PARAMETER ||
            token.outputInfo.arrayDetails ||
            token.key === constants.UNTIL_CURRENT_ITERATION_INDEX_KEY ||
            token.key === constants.FOREACH_CURRENT_ITEM_KEY
          );
        }
        return supportedTypes.some((supportedType) => {
          return !Array.isArray(token.type) && equals(supportedType, token.type);
        });
      }),
    }));

    return (
      <TokenPicker
        editorId={editorId}
        labelId={labelId}
        tokenGroup={tokenGroup}
        filteredTokenGroup={filteredTokenGroup}
        expressionGroup={expressionGroup}
        tokenPickerFocused={tokenPickerClicked}
        initialMode={tokenPickerMode}
        getValueSegmentFromToken={(token: OutputToken, addImplicitForeach: boolean) =>
          getValueSegmentFromToken(parameterId, token, addImplicitForeach, !!isCodeEditor)
        }
        tokenClickedCallback={tokenClickedCallback}
        closeTokenPicker={closeTokenPicker}
      />
    );
  };

  const onExpandSection = (sectionName: string) => {
    if (sectionName) {
      setSectionExpanded(!sectionExpanded);
    }
  };

  const settings: Settings[] = group?.parameters
    .filter((x) => !x.hideInUI && shouldUseParameterInGroup(x, group.parameters))
    .map((param) => {
      const { id, label, value, required, showTokens, placeholder, editorViewModel, dynamicData, conditionalVisibility, validationErrors } =
        param;
      const paramSubset = { id, label, required, showTokens, placeholder, editorViewModel, conditionalVisibility };
      const { editor, editorOptions } = getEditorAndOptions(param, upstreamNodeIds ?? [], variables);

      const { value: remappedValues } = remapValueSegmentsWithNewIds(value, idReplacements);

      return {
        settingType: 'SettingTokenField',
        settingProp: {
          ...paramSubset,
          readOnly,
          value: remappedValues,
          editor,
          editorOptions,
          tokenEditor: true,
          isLoading: dynamicData?.status === DynamicCallStatus.STARTED,
          errorDetails: dynamicData?.error ? { message: dynamicData.error.message } : undefined,
          validationErrors,
          onValueChange: (newState: ChangeState) => onValueChange(id, newState),
          onComboboxMenuOpen: () => onComboboxMenuOpen(param),
          pickerCallbacks: getPickerCallbacks(param),
          onCastParameter: (value: ValueSegment[], type?: string, format?: string, suppressCasting?: boolean) =>
            parameterValueToString({ value, type: type ?? 'string', info: { format }, suppressCasting } as ParameterInfo, false) ?? '',
          getTokenPicker: (
            editorId: string,
            labelId: string,
            tokenPickerMode?: TokenPickerMode,
            editorType?: string,
            closeTokenPicker?: () => void,
            tokenPickerClicked?: (b: boolean) => void,
            tokenClickedCallback?: (token: ValueSegment) => void
          ) =>
            getTokenPicker(
              id,
              editorId,
              labelId,
              tokenPickerMode,
              editorType,
              editor?.toLowerCase() === constants.EDITOR.CODE,
              closeTokenPicker,
              tokenPickerClicked,
              tokenClickedCallback
            ),
        },
      };
    });

  return (
    <SettingsSection
      id={group.id}
      sectionName={group.description}
      title={group.description}
      settings={settings}
      showHeading={!!group.description}
      expanded={sectionExpanded}
      onHeaderClick={onExpandSection}
      showSeparator={false}
    />
  );
};

const getEditorAndOptions = (
  parameter: ParameterInfo,
  upstreamNodeIds: string[],
  variables: Record<string, VariableDeclaration[]>
): { editor?: string; editorOptions?: any } => {
  const { editor, editorOptions } = parameter;
  const supportedTypes: string[] = editorOptions?.supportedTypes ?? [];
  if (equals(editor, 'variablename')) {
    return {
      editor: 'dropdown',
      editorOptions: {
        options: getAvailableVariables(variables, upstreamNodeIds)
          .filter((variable) => {
            if (supportedTypes?.length === 0) return true;
            return supportedTypes.includes(variable.type);
          })
          .map((variable) => ({
            value: variable.name,
            displayName: variable.name,
          })),
      },
    };
  }

  return { editor, editorOptions };
};

const hasParametersToAuthor = (parameterGroups: Record<string, ParameterGroup>): boolean => {
  return Object.keys(parameterGroups).some((key) => parameterGroups[key].parameters.filter((p) => !p.hideInUI).length > 0);
};

export const parametersTab: PanelTab = {
  title: 'Parameters',
  name: constants.PANEL_TAB_NAMES.PARAMETERS,
  description: 'Request History',
  visible: true,
  content: <ParametersTab />,
  order: 0,
  icon: 'Info',
};
