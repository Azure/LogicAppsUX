import constants from '../../../../../common/constants';
import { useShowIdentitySelectorQuery } from '../../../../../core/state/connection/connectionSelector';
import { addOrUpdateCustomCode, renameCustomCodeFile } from '../../../../../core/state/customcode/customcodeSlice';
import { useHostOptions, useReadOnly } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import type { ParameterGroup } from '../../../../../core/state/operation/operationMetadataSlice';
import {
  DynamicLoadStatus,
  ErrorLevel,
  updateAgentParametersInNode,
  updateNodeParameters,
} from '../../../../../core/state/operation/operationMetadataSlice';
import { useDependencies, useNodesInitialized, useOperationErrorInfo } from '../../../../../core/state/operation/operationSelector';
import { useIsPanelInPinnedViewMode, usePanelLocation } from '../../../../../core/state/panel/panelSelectors';
import {
  useAllowUserToChangeConnection,
  useConnectorName,
  useIsInlineConnection,
  useNodeConnectionName,
  useOperationInfo,
} from '../../../../../core/state/selectors/actionMetadataSelector';
import type { AgentParameterDeclaration, VariableDeclaration } from '../../../../../core/state/tokens/tokensSlice';
import { addAgentParameterToNode, updateAgentParameter, updateVariableInfo } from '../../../../../core/state/tokens/tokensSlice';
import { useGetSwitchOrAgentParentId, useNodeMetadata, useReplacedIds } from '../../../../../core/state/workflow/workflowSelectors';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { getConnectionReference } from '../../../../../core/utils/connectors/connections';
import { isRootNodeInGraph } from '../../../../../core/utils/graph';
import {
  getDisplayValueFromPickerSelectedItem,
  getTypeForTokenFiltering,
  getValueFromPickerSelectedItem,
  loadDynamicTreeItemsForParameter,
  loadDynamicValuesForParameter,
  loadParameterValueFromString,
  ParameterGroupKeys,
  parameterValueToString,
  remapEditorViewModelWithNewIds,
  remapValueSegmentsWithNewIds,
  shouldEncodeParameterValueForOperationBasedOnMetadata,
  shouldUseParameterInGroup,
  updateParameterAndDependencies,
} from '../../../../../core/utils/parameters/helper';
import type { TokenGroup } from '../../../../../core/utils/tokens';
import { createValueSegmentFromToken, getExpressionTokenSections, getOutputTokenSections } from '../../../../../core/utils/tokens';
import { getAvailableVariables } from '../../../../../core/utils/variables';
import { SettingsSection } from '../../../../settings/settingsection';
import type { Settings } from '../../../../settings/settingsection';
import { ConnectionDisplay } from './connectionDisplay';
import { IdentitySelector } from './identityselector';
import { MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import { Divider } from '@fluentui/react-components';
import {
  PanelLocation,
  TokenPicker,
  TokenPickerButtonLocation,
  TokenType,
  convertSegmentsToString,
  convertVariableEditorSegmentsAsSchema,
  createLiteralValueSegment,
  isCustomCodeParameter,
  isInitializeVariableOperation,
  parseSchemaAsVariableEditorSegments,
  toCustomEditorAndOptions,
} from '@microsoft/designer-ui';
import type {
  ChangeState,
  ParameterInfo,
  ValueSegment,
  OutputToken,
  TokenPickerMode,
  PanelTabFn,
  PanelTabProps,
  InitializeVariableProps,
} from '@microsoft/designer-ui';
import { EditorService, equals, getPropertyValue, getRecordEntry, isRecordNotEmpty, SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import type { OperationInfo } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { ConnectionInline } from './connectionInline';
import { ConnectionsSubMenu } from './connectionsSubMenu';

export const ParametersTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const nodeMetadata = useNodeMetadata(selectedNodeId);
  const inputs = useSelector((state: RootState) => state.operations.inputParameters[selectedNodeId]);
  const { tokenState, workflowParametersState, workflowState } = useSelector((state: RootState) => ({
    tokenState: state.tokens,
    workflowParametersState: state.workflowParameters,
    workflowState: state.workflow,
  }));
  const nodeType = useSelector((state: RootState) => state.operations.operationInfo[selectedNodeId]?.type);
  const readOnly = useReadOnly();
  const nodesInitialized = useNodesInitialized();

  const connectionName = useNodeConnectionName(selectedNodeId);
  const operationInfo = useOperationInfo(selectedNodeId);
  const showConnectionDisplay = useAllowUserToChangeConnection(operationInfo);
  const isInlineConnection = useIsInlineConnection(operationInfo);
  const showIdentitySelector = useShowIdentitySelectorQuery(selectedNodeId);
  const errorInfo = useOperationErrorInfo(selectedNodeId);
  const { hideUTFExpressions } = useHostOptions();
  const replacedIds = useReplacedIds();
  const switchOrAgentParentInfo = useGetSwitchOrAgentParentId(selectedNodeId);

  const isPaneInPinnedViewMode = useIsPanelInPinnedViewMode();

  const intl = useIntl();

  const emptyParametersMessage = intl.formatMessage({
    defaultMessage: 'No additional information is needed for this step. You will be able to use the outputs in subsequent steps.',
    id: 'BtL7UI',
    description: 'Message to show when there are no parameters to author in operation.',
  });
  const cannotUpdateConnectionIfPinnedMessage = intl.formatMessage({
    defaultMessage: 'Connections cannot be edited in pinned view. Release the pinned action to make connection changes.',
    id: 'rl9UOO',
    description:
      'Descriptive message to show if the connection for an action cannot be changed or edited due to being shown in dual-pane (pinned action) view.',
  });

  const isLoading = useMemo(() => {
    if (!operationInfo && !nodeMetadata?.subgraphType) {
      return true;
    }
    if (!nodesInitialized) {
      return true;
    }
    if (inputs?.dynamicLoadStatus === DynamicLoadStatus.LOADING) {
      return true;
    }
    return false;
  }, [inputs?.dynamicLoadStatus, nodeMetadata?.subgraphType, nodesInitialized, operationInfo]);

  const noVisibleParams = useMemo(() => {
    return !hasParametersToAuthor(inputs?.parameterGroups ?? {});
  }, [inputs?.parameterGroups]);
  const showNoParamsMessage = useMemo(() => {
    const haveDynamicInputsError = errorInfo?.level === ErrorLevel.DynamicInputs;
    return noVisibleParams && !haveDynamicInputsError;
  }, [errorInfo?.level, noVisibleParams]);

  if (isLoading) {
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} />
      </div>
    );
  }

  const tokenGroup = getOutputTokenSections(
    switchOrAgentParentInfo?.parentId ?? selectedNodeId,
    switchOrAgentParentInfo?.type ?? nodeType,
    tokenState,
    workflowParametersState,
    workflowState,
    replacedIds
  );
  const expressionGroup = getExpressionTokenSections(hideUTFExpressions);

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
      {showNoParamsMessage ? <MessageBar messageBarType={MessageBarType.info}>{emptyParametersMessage}</MessageBar> : null}
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
      {!isInlineConnection && operationInfo && showConnectionDisplay && connectionName.isLoading !== undefined ? (
        <>
          <Divider style={{ padding: '16px 0px' }} />
          <ConnectionDisplay
            connectionName={connectionName.result}
            nodeId={selectedNodeId}
            isLoading={connectionName.isLoading}
            readOnly={!!readOnly || isPaneInPinnedViewMode}
            readOnlyReason={isPaneInPinnedViewMode ? cannotUpdateConnectionIfPinnedMessage : undefined}
            hasError={errorInfo?.level === ErrorLevel.Connection}
          />
        </>
      ) : null}
      {!showIdentitySelector.isLoading && showIdentitySelector.result ? (
        <IdentitySelector nodeId={selectedNodeId} readOnly={!!readOnly} />
      ) : null}
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
  const isTrigger = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const operationInfo = useOperationInfo(nodeId);
  const dependencies = useDependencies(nodeId);
  const { variables, upstreamNodeIds, operationDefinition, connectionReference, idReplacements, workflowParameters, nodesMetadata } =
    useSelector((state: RootState) => {
      return {
        upstreamNodeIds: getRecordEntry(state.tokens.outputTokens, nodeId)?.upstreamNodeIds,
        variables: state.tokens.variables,
        operationDefinition: getRecordEntry(state.workflow.newlyAddedOperations, nodeId)
          ? undefined
          : getRecordEntry(state.workflow.operations, nodeId),
        connectionReference: getConnectionReference(state.connections, nodeId),
        idReplacements: state.workflow.idReplacements,
        workflowParameters: state.workflowParameters.definitions,
        nodesMetadata: state.workflow.nodesMetadata,
      };
    });
  const rootState = useSelector((state: RootState) => state);
  const displayNameResult = useConnectorName(operationInfo);
  const panelLocation = usePanelLocation();

  const { suppressCastingForSerialize, hideUTFExpressions, enableMultiVariable } = useHostOptions();

  const [tokenMapping, setTokenMapping] = useState<Record<string, ValueSegment>>({});

  const nodeInputs = useMemo(
    () => rootState.operations.inputParameters[nodeId] ?? { parameterGroups: {} },
    [nodeId, rootState.operations.inputParameters]
  );

  const onValueChange = useCallback(
    (id: string, newState: ChangeState, skipStateSave?: boolean) => {
      const { value, viewModel } = newState;
      const parameter = nodeInputs.parameterGroups[group.id].parameters.find((param: any) => param.id === id);

      const propertiesToUpdate: Partial<ParameterInfo> = {
        value,
        preservedValue: undefined,
        ...(viewModel && { editorViewModel: viewModel }),
      };

      if (isInitializeVariableOperation(operationInfo)) {
        const variables: InitializeVariableProps[] | undefined = viewModel?.variables;
        if (variables?.length) {
          dispatch(
            updateVariableInfo({
              id: nodeId,
              variables: variables.map(({ name, type }) => {
                return {
                  name: name[0]?.value,
                  type: type[0]?.value,
                };
              }),
            })
          );
        }
      }
      const nodeMetadataInfo = getRecordEntry(nodesMetadata, nodeId);
      if (nodeMetadataInfo?.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION && nodeMetadataInfo?.parentNodeId) {
        const agentParameters: InitializeVariableProps[] = viewModel?.variables ?? [];
        const agentParameter: Record<string, AgentParameterDeclaration> = Object.fromEntries(
          agentParameters.map(({ name, type, description }) => [
            name?.[0]?.value,
            {
              name: name?.[0]?.value,
              type: type?.[0]?.value,
              description: convertSegmentsToString(description ?? []),
            },
          ])
        );
        dispatch(
          updateAgentParameter({
            id: nodeId,
            agent: nodeMetadataInfo.parentNodeId,
            agentParameter,
          })
        );
        const agentParameterUpdates = agentParameters
          .map(({ name, type, description }) => {
            const paramName = name?.[0]?.value;
            if (!paramName) {
              return null;
            }

            return {
              name: paramName,
              type: type?.[0]?.value ?? '',
              description: convertSegmentsToString(description ?? []),
            };
          })
          .filter(Boolean) as Array<{ name: string; type: string; description: string }>;
        dispatch(updateAgentParametersInNode(agentParameterUpdates));
      }

      if (parameter && isCustomCodeParameter(parameter)) {
        const { fileData, fileExtension, fileName } = viewModel.customCodeData;
        dispatch(addOrUpdateCustomCode({ nodeId, fileData, fileExtension, fileName }));
      }

      dispatch(
        updateParameterAndDependencies({
          nodeId,
          groupId: group.id,
          parameterId: id,
          properties: propertiesToUpdate,
          isTrigger,
          operationInfo,
          connectionReference,
          nodeInputs,
          dependencies,
          operationDefinition,
          skipStateSave,
        })
      );
    },
    [
      nodeInputs,
      group.id,
      nodesMetadata,
      nodeId,
      dispatch,
      isTrigger,
      operationInfo,
      connectionReference,
      dependencies,
      operationDefinition,
    ]
  );

  const onComboboxMenuOpen = (parameter: ParameterInfo): void => {
    if (parameter.dynamicData?.status === DynamicLoadStatus.FAILED || parameter.dynamicData?.status === DynamicLoadStatus.NOTSTARTED) {
      loadDynamicValuesForParameter(
        nodeId,
        group.id,
        parameter.id,
        operationInfo,
        connectionReference,
        nodeInputs,
        dependencies,
        true /* showErrorWhenNotReady */,
        dispatch,
        idReplacements,
        workflowParameters
      );
    }
  };

  const fileNameChange = useCallback(
    (originalFileName: string, fileName: string): void => {
      dispatch(renameCustomCodeFile({ newFileName: fileName, oldFileName: originalFileName }));
    },
    [dispatch]
  );

  const getPickerCallbacks = (parameter: ParameterInfo) => ({
    getFileSourceName: (): string => {
      return displayNameResult.result;
    },
    getDisplayValueFromSelectedItem: (selectedItem: any) => getDisplayValueFromPickerSelectedItem(selectedItem, parameter, dependencies),
    getValueFromSelectedItem: (selectedItem: any) => getValueFromPickerSelectedItem(selectedItem, parameter, dependencies),
    onFolderNavigation: (selectedItem: any | undefined): void => {
      loadDynamicTreeItemsForParameter(
        nodeId,
        group.id,
        parameter.id,
        selectedItem,
        operationInfo,
        connectionReference,
        nodeInputs,
        dependencies,
        true /* showErrorWhenNotReady */,
        dispatch,
        idReplacements,
        workflowParameters
      );
    },
  });

  const getValueSegmentFromToken = useCallback(
    async (
      parameterId: string,
      token: OutputToken,
      addImplicitForeachIfNeeded: boolean,
      addLatestActionName: boolean
    ): Promise<ValueSegment> => {
      return createValueSegmentFromToken(nodeId, parameterId, token, addImplicitForeachIfNeeded, addLatestActionName, rootState, dispatch);
    },
    [dispatch, nodeId, rootState]
  );

  const showAgentParameterButton = useMemo(() => {
    let nodeGraphId = getRecordEntry(nodesMetadata, nodeId)?.graphId;

    while (nodeGraphId) {
      const nodeMetadata = getRecordEntry(nodesMetadata, nodeGraphId);
      if (!nodeMetadata) {
        return undefined;
      }

      const isAgentCondition = nodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION;
      if (isAgentCondition) {
        break;
      }

      nodeGraphId = nodeMetadata.graphId;
    }
    return !!nodeGraphId;
  }, [nodesMetadata, nodeId]);

  const createOrUpdateAgentParameter = (name: string, type: string, description: string, isUpdating?: boolean) => {
    let nodeGraphId = getRecordEntry(nodesMetadata, nodeId)?.graphId;

    while (nodeGraphId) {
      const nodeMetadata = getRecordEntry(nodesMetadata, nodeGraphId);
      if (!nodeMetadata) {
        return undefined;
      }

      const isAgentCondition = nodeMetadata.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION;
      if (isAgentCondition) {
        break;
      }

      nodeGraphId = nodeMetadata.graphId;
    }

    if (!nodeGraphId) {
      return undefined;
    }

    const upstreamAgentNodeId = getRecordEntry(nodesMetadata, nodeGraphId)?.parentNodeId;
    if (!upstreamAgentNodeId) {
      return undefined;
    }
    dispatch(
      addAgentParameterToNode({
        conditionId: nodeGraphId,
        agentId: upstreamAgentNodeId,
        agentParameter: { name, type, description },
      })
    );

    const conditionParameter = rootState.operations.inputParameters[nodeGraphId].parameterGroups[
      ParameterGroupKeys.DEFAULT
    ].parameters.find((param: any) => param.parameterName === 'agentParameterSchema');
    if (!conditionParameter?.id) {
      return;
    }
    const previousConditionValue = parseSchemaAsVariableEditorSegments(conditionParameter.value) ?? [];
    previousConditionValue.push({
      name: [createLiteralValueSegment(name)],
      type: [createLiteralValueSegment(type)],
      description: [createLiteralValueSegment(description)],
      value: [],
    });

    const newConditionValue = convertVariableEditorSegmentsAsSchema(previousConditionValue);

    dispatch(
      updateNodeParameters({
        nodeId: nodeGraphId,
        parameters: [
          {
            groupId: ParameterGroupKeys.DEFAULT,
            parameterId: conditionParameter.id,
            propertiesToUpdate: { value: newConditionValue, preservedValue: undefined },
          },
        ],
      })
    );

    if (isUpdating) {
      dispatch(updateAgentParametersInNode([{ name, type, description }]));
    }
  };

  const getTokenPicker = (
    parameter: ParameterInfo,
    editorId: string,
    labelId: string,
    tokenPickerMode?: TokenPickerMode,
    editorType?: string,
    isCodeEditor?: boolean,
    tokenClickedCallback?: (token: ValueSegment) => void
  ): JSX.Element => {
    const parameterType = editorType ?? parameter?.type;
    const supportedTypes: string[] = getPropertyValue(constants.TOKENS, getTypeForTokenFiltering(parameterType));

    const filteredTokenGroup = tokenGroup.map((group) => ({
      ...group,
      tokens: group.tokens.filter((token: OutputToken) => {
        if (isCodeEditor) {
          return !(
            token.outputInfo.type === TokenType.VARIABLE ||
            token.outputInfo.type === TokenType.PARAMETER ||
            token.outputInfo.type === TokenType.AGENTPARAMETER ||
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
        hideUTFExpressions={hideUTFExpressions}
        initialMode={tokenPickerMode}
        getValueSegmentFromToken={(token: OutputToken, addImplicitForeach: boolean) =>
          getValueSegmentFromToken(parameter.id, token, addImplicitForeach, !!isCodeEditor)
        }
        valueType={parameterType}
        parameter={parameter}
        tokenClickedCallback={tokenClickedCallback}
        createOrUpdateAgentParameter={createOrUpdateAgentParameter}
      />
    );
  };

  useEffect(() => {
    const callback = async () => {
      const mapping: Record<string, ValueSegment> = {};
      for (const group of tokenGroup) {
        for (const token of group.tokens) {
          if (!token.value) {
            continue;
          }

          mapping[token.value] = await getValueSegmentFromToken(nodeId, token, false, false);
        }
      }
      setTokenMapping(mapping);
    };

    callback();
  }, [getValueSegmentFromToken, nodeId, tokenGroup]);

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
      const remappedEditorViewModel = isRecordNotEmpty(idReplacements)
        ? remapEditorViewModelWithNewIds(editorViewModel, idReplacements)
        : editorViewModel;
      const paramSubset = {
        id,
        label,
        required,
        showTokens,
        placeholder,
        editorViewModel: remappedEditorViewModel,
        conditionalVisibility,
      };
      const { editor, editorOptions } = getEditorAndOptions(operationInfo, param, upstreamNodeIds ?? [], variables);

      const { value: remappedValues } = isRecordNotEmpty(idReplacements) ? remapValueSegmentsWithNewIds(value, idReplacements) : { value };
      const isCodeEditor = editor?.toLowerCase() === constants.EDITOR.CODE;
      const subComponent = getSubComponent(param);
      const subMenu = getSubMenu(param);
      return {
        settingType: 'SettingTokenField',
        settingProp: {
          ...paramSubset,
          readOnly,
          value: remappedValues,
          editor,
          editorOptions,
          tokenEditor: true,
          isDynamic: dynamicData !== undefined,
          isLoading: dynamicData?.status === DynamicLoadStatus.LOADING,
          errorDetails: dynamicData?.error ? { message: dynamicData.error.message } : undefined,
          validationErrors,
          tokenMapping,
          loadParameterValueFromString,
          onValueChange: (newState: ChangeState, skipStateSave?: boolean) => onValueChange(id, newState, skipStateSave),
          onComboboxMenuOpen: () => onComboboxMenuOpen(param),
          onFileNameChange: fileNameChange,
          pickerCallbacks: getPickerCallbacks(param),
          tokenpickerButtonProps: {
            location: panelLocation === PanelLocation.Left ? TokenPickerButtonLocation.Right : TokenPickerButtonLocation.Left,
          },
          agentParameterButtonProps: { showAgentParameterButton },
          hostOptions: { suppressCastingForSerialize, isMultiVariableEnabled: enableMultiVariable },
          onCastParameter: (value: ValueSegment[], type?: string, format?: string, suppressCasting?: boolean) =>
            parameterValueToString(
              {
                value,
                type: type ?? 'string',
                info: { format },
                suppressCasting,
              } as ParameterInfo,
              false,
              idReplacements,
              shouldEncodeParameterValueForOperationBasedOnMetadata(operationInfo)
            ) ?? '',
          getTokenPicker: (
            editorId: string,
            labelId: string,
            tokenPickerMode?: TokenPickerMode,
            editorType?: string,
            tokenClickedCallback?: (token: ValueSegment) => void
          ) => getTokenPicker(param, editorId, labelId, tokenPickerMode, editorType, isCodeEditor, tokenClickedCallback),
          subComponent: subComponent,
          subMenu: subMenu,
        },
      };
    });

  return (
    <SettingsSection
      id={group.id}
      nodeId={nodeId}
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

const getSubComponent = (parameter: ParameterInfo) => {
  const hasConnectionInline = getPropertyValue(parameter.schema, 'x-ms-connection-required');
  if (hasConnectionInline) {
    return <ConnectionInline />;
  }
  return null;
};

const getSubMenu = (parameter: ParameterInfo) => {
  const hasConnectionInline = getPropertyValue(parameter.schema, 'x-ms-connection-required');
  if (hasConnectionInline) {
    return <ConnectionsSubMenu />;
  }
  return null;
};

export const getEditorAndOptions = (
  operationInfo: OperationInfo,
  parameter: ParameterInfo,
  upstreamNodeIds: string[],
  variables: Record<string, VariableDeclaration[]>
): { editor?: string; editorOptions?: any } => {
  const customEditor = EditorService()?.getEditor({
    operationInfo,
    parameter,
  });
  if (customEditor) {
    return toCustomEditorAndOptions(customEditor);
  }

  const { editor, editorOptions } = parameter;
  const supportedTypes: string[] = editorOptions?.supportedTypes ?? [];
  if (equals(editor, 'variablename')) {
    return {
      editor: 'dropdown',
      editorOptions: {
        options: getAvailableVariables(variables, upstreamNodeIds)
          .filter((variable) => {
            if (supportedTypes?.length === 0) {
              return true;
            }
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

export const parametersTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.PARAMETERS,
  title: intl.formatMessage({
    defaultMessage: 'Parameters',
    id: 'uxKRO/',
    description: 'Parameters tab title',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Configure parameters for this node',
    id: 'SToblZ',
    description: 'Parameters tab description',
  }),
  visible: true,
  content: <ParametersTab {...props} />,
  order: 0,
  icon: 'Info',
});
