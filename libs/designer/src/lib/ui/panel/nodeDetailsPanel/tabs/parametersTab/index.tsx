import constants from '../../../../../common/constants';
import { useShowIdentitySelectorQuery } from '../../../../../core/state/connection/connectionSelector';
import { useHostOptions, useReadOnly } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import type { ParameterGroup } from '../../../../../core/state/operation/operationMetadataSlice';
import { DynamicLoadStatus, ErrorLevel } from '../../../../../core/state/operation/operationMetadataSlice';
import {
  useDependencies,
  useNodesInitialized,
  useOperationErrorInfo,
  useRawInputParameters,
} from '../../../../../core/state/operation/operationSelector';
import { usePanelLocation, useSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import {
  useAllowUserToChangeConnection,
  useConnectorName,
  useNodeConnectionName,
  useOperationInfo,
} from '../../../../../core/state/selectors/actionMetadataSelector';
import type { VariableDeclaration } from '../../../../../core/state/tokens/tokensSlice';
import { updateVariableInfo } from '../../../../../core/state/tokens/tokensSlice';
import { useNodeMetadata, useReplacedIds } from '../../../../../core/state/workflow/workflowSelectors';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { getConnectionReference } from '../../../../../core/utils/connectors/connections';
import { isRootNodeInGraph } from '../../../../../core/utils/graph';
import {
  loadDynamicTreeItemsForParameter,
  loadDynamicValuesForParameter,
  loadParameterValueFromString,
  parameterValueToString,
  remapValueSegmentsWithNewIds,
  shouldUseParameterInGroup,
  updateParameterAndDependencies,
} from '../../../../../core/utils/parameters/helper';
import type { TokenGroup } from '../../../../../core/utils/tokens';
import { createValueSegmentFromToken, getExpressionTokenSections, getOutputTokenSections } from '../../../../../core/utils/tokens';
import { getAllVariables, getAvailableVariables } from '../../../../../core/utils/variables';
import { SettingsSection } from '../../../../settings/settingsection';
import type { Settings } from '../../../../settings/settingsection';
import { ConnectionDisplay } from './connectionDisplay';
import { IdentitySelector } from './identityselector';
import { MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import { Divider } from '@fluentui/react-components';
import { EditorService } from '@microsoft/logic-apps-shared';
import {
  DynamicCallStatus,
  PanelLocation,
  TokenPicker,
  TokenPickerButtonLocation,
  TokenType,
  toCustomEditorAndOptions,
} from '@microsoft/designer-ui';
import type { ChangeState, ParameterInfo, ValueSegment, OutputToken, TokenPickerMode, PanelTabFn } from '@microsoft/designer-ui';
import type { OperationInfo } from '@microsoft/logic-apps-shared';
import { equals, getPropertyValue, getRecordEntry } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const nodesInitialized = useNodesInitialized();

  const connectionName = useNodeConnectionName(selectedNodeId);
  const operationInfo = useOperationInfo(selectedNodeId);
  const showConnectionDisplay = useAllowUserToChangeConnection(operationInfo);
  const showIdentitySelector = useShowIdentitySelectorQuery(selectedNodeId);
  const errorInfo = useOperationErrorInfo(selectedNodeId);
  const { hideUTFExpressions } = useHostOptions();
  const replacedIds = useReplacedIds();

  const emptyParametersMessage = useIntl().formatMessage({
    defaultMessage: 'No additional information is needed for this step. You will be able to use the outputs in subsequent steps.',
    description: 'Message to show when there are no parameters to author in operation.',
  });

  const isLoading = useMemo(() => {
    if (!operationInfo && !nodeMetadata?.subgraphType) return true;
    if (!nodesInitialized) return true;
    if (inputs?.dynamicLoadStatus === DynamicLoadStatus.STARTED) return true;
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

  const tokenGroup = getOutputTokenSections(selectedNodeId, nodeType, tokenState, workflowParametersState, replacedIds);
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
      {operationInfo && showConnectionDisplay && connectionName.isLoading !== undefined ? (
        <>
          <Divider style={{ padding: '16px 0px' }} />
          <ConnectionDisplay
            connectionName={connectionName.result}
            nodeId={selectedNodeId}
            isLoading={connectionName.isLoading}
            readOnly={!!readOnly}
            hasError={errorInfo?.level === ErrorLevel.Connection}
          />
        </>
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
  const isTrigger = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const nodeInputs = useRawInputParameters(nodeId) ?? { parameterGroups: {} };
  const operationInfo = useOperationInfo(nodeId);
  const dependencies = useDependencies(nodeId);
  const {
    settings: nodeSettings,
    variables,
    upstreamNodeIds,
    operationDefinition,
    connectionReference,
    idReplacements,
    workflowParameters,
  } = useSelector((state: RootState) => {
    return {
      settings: getRecordEntry(state.operations.settings, nodeId) ?? {},
      upstreamNodeIds: getRecordEntry(state.tokens.outputTokens, nodeId)?.upstreamNodeIds,
      variables: state.tokens.variables,
      operationDefinition: getRecordEntry(state.workflow.newlyAddedOperations, nodeId)
        ? undefined
        : getRecordEntry(state.workflow.operations, nodeId),
      connectionReference: getConnectionReference(state.connections, nodeId),
      idReplacements: state.workflow.idReplacements,
      workflowParameters: state.workflowParameters.definitions,
    };
  });
  const rootState = useSelector((state: RootState) => state);
  const displayNameResult = useConnectorName(operationInfo);
  const panelLocation = usePanelLocation();

  const { suppressCastingForSerialize, hideUTFExpressions } = useHostOptions();

  const [tokenMapping, setTokenMapping] = useState<Record<string, ValueSegment>>({});

  const onValueChange = useCallback(
    (id: string, newState: ChangeState) => {
      const { value, viewModel } = newState;
      const parameter = nodeInputs.parameterGroups[group.id].parameters.find((param: any) => param.id === id);

      const propertiesToUpdate = { value, preservedValue: undefined } as Partial<ParameterInfo>;

      if (viewModel !== undefined) {
        propertiesToUpdate.editorViewModel = viewModel;
      }
      if (getRecordEntry(variables, nodeId)) {
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
      return getPropertyValue(selectedItem, dependency.filePickerInfo?.fullTitlePath ?? '');
    },
    getValueFromSelectedItem: (selectedItem: any): string => {
      const dependency = dependencies.inputs[parameter.parameterKey];
      return getPropertyValue(selectedItem, dependency.filePickerInfo?.valuePath ?? '');
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

  const getTokenPicker = (
    parameterId: string,
    editorId: string,
    labelId: string,
    tokenPickerMode?: TokenPickerMode,
    editorType?: string,
    isCodeEditor?: boolean,
    setIsTokenPickerOpened?: (b: boolean) => void,
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
        hideUTFExpressions={hideUTFExpressions}
        setIsTokenPickerOpened={setIsTokenPickerOpened}
        initialMode={tokenPickerMode}
        getValueSegmentFromToken={(token: OutputToken, addImplicitForeach: boolean) =>
          getValueSegmentFromToken(parameterId, token, addImplicitForeach, !!isCodeEditor)
        }
        tokenClickedCallback={tokenClickedCallback}
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
      const paramSubset = { id, label, required, showTokens, placeholder, editorViewModel, conditionalVisibility };
      const { editor, editorOptions } = getEditorAndOptions(operationInfo, param, upstreamNodeIds ?? [], variables);

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
          tokenMapping,
          loadParameterValueFromString: (value: string) => loadParameterValueFromString(value),
          onValueChange: (newState: ChangeState) => onValueChange(id, newState),
          onComboboxMenuOpen: () => onComboboxMenuOpen(param),
          pickerCallbacks: getPickerCallbacks(param),
          tokenpickerButtonProps: {
            location: panelLocation === PanelLocation.Left ? TokenPickerButtonLocation.Right : TokenPickerButtonLocation.Left,
          },
          suppressCastingForSerialize: suppressCastingForSerialize ?? false,
          onCastParameter: (value: ValueSegment[], type?: string, format?: string, suppressCasting?: boolean) =>
            parameterValueToString(
              { value, type: type ?? 'string', info: { format }, suppressCasting } as ParameterInfo,
              false,
              idReplacements
            ) ?? '',
          getTokenPicker: (
            editorId: string,
            labelId: string,
            tokenPickerMode?: TokenPickerMode,
            editorType?: string,
            setIsInTokenPicker?: (b: boolean) => void,
            tokenClickedCallback?: (token: ValueSegment) => void
          ) =>
            getTokenPicker(
              id,
              editorId,
              labelId,
              tokenPickerMode,
              editorType,
              editor?.toLowerCase() === constants.EDITOR.CODE,
              setIsInTokenPicker,
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

export const parametersTab: PanelTabFn = (intl) => ({
  id: constants.PANEL_TAB_NAMES.PARAMETERS,
  title: intl.formatMessage({ defaultMessage: 'Parameters', description: 'Parameters tab title' }),
  description: intl.formatMessage({ defaultMessage: 'Configure parameters for this node', description: 'Parameters tab description' }),
  visible: true,
  content: <ParametersTab />,
  order: 0,
  icon: 'Info',
});
