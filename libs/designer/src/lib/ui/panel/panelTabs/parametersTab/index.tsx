import constants from '../../../../common/constants';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import type { ParameterGroup } from '../../../../core/state/operation/operationMetadataSlice';
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
import { addForeachToNode } from '../../../../core/utils/loops';
import {
  loadDynamicValuesForParameter,
  shouldUseParameterInGroup,
  updateParameterAndDependencies,
} from '../../../../core/utils/parameters/helper';
import { getFilePickerCallbacks } from '../../../../core/utils/parameters/picker';
import type { TokenGroup } from '../../../../core/utils/tokens';
import { createValueSegmentFromToken, getExpressionTokenSections, getOutputTokenSections } from '../../../../core/utils/tokens';
import { getAllVariables, getAvailableVariables } from '../../../../core/utils/variables';
import { SettingsSection } from '../../../settings/settingsection';
import type { Settings } from '../../../settings/settingsection';
import { ConnectionDisplay } from './connectionDisplay';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { DynamicCallStatus, TokenPicker, ValueSegmentType } from '@microsoft/designer-ui';
import type { ChangeState, PanelTab, ParameterInfo, ValueSegment, OutputToken, TokenPickerMode } from '@microsoft/designer-ui';
import { equals } from '@microsoft/utils-logic-apps';
import { useCallback, useState } from 'react';
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

  const replacedIds = useReplacedIds();
  const tokenGroup = getOutputTokenSections(selectedNodeId, nodeType, tokenState, workflowParametersState, replacedIds);
  const expressionGroup = getExpressionTokenSections();

  if (!operationInfo && !nodeMetadata?.subgraphType) {
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} />
      </div>
    );
  }

  return (
    <>
      {Object.keys(inputs?.parameterGroups ?? {}).map((sectionName) => (
        <div key={sectionName}>
          <ParameterSection
            key={selectedNodeId}
            nodeId={selectedNodeId}
            nodeType={nodeType}
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
    </>
  );
};

const ParameterSection = ({
  nodeId,
  nodeType,
  group,
  readOnly,
  tokenGroup,
  expressionGroup,
}: {
  nodeId: string;
  nodeType?: string;
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
    };
  });
  const rootState = useSelector((state: RootState) => state);
  const displayNameResult = useConnectorName(operationInfo);

  const onValueChange = useCallback(
    (id: string, newState: ChangeState) => {
      const { value, viewModel } = newState;
      const propertiesToUpdate = { value, preservedValue: undefined } as Partial<ParameterInfo>;

      if (viewModel !== undefined) {
        propertiesToUpdate.editorViewModel = viewModel;
      }
      const parameter = nodeInputs.parameterGroups[group.id].parameters.find((param: any) => param.id === id);
      if (variables[nodeId] && (parameter?.parameterKey === 'inputs.$.name' || parameter?.parameterKey === 'inputs.$.type')) {
        dispatch(updateVariableInfo({ id: nodeId, name: value[0]?.value }));
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
        idReplacements
      );
    }
  };

  const getValueSegmentFromToken = async (
    parameterId: string,
    token: OutputToken,
    addImplicitForeachIfNeeded: boolean
  ): Promise<ValueSegment> => {
    const { segment, foreachDetails } = await createValueSegmentFromToken(
      nodeId,
      parameterId,
      token,
      addImplicitForeachIfNeeded,
      rootState
    );
    if (foreachDetails) {
      dispatch(addForeachToNode({ arrayName: foreachDetails.arrayValue, nodeId, token }));
    }

    return segment;
  };

  const getTokenPicker = (
    parameterId: string,
    editorId: string,
    labelId: string,
    tokenPickerMode?: TokenPickerMode,
    isCodeEditor?: boolean,
    closeTokenPicker?: () => void,
    tokenPickerClicked?: (b: boolean) => void,
    tokenClickedCallback?: (token: ValueSegment) => void
  ): JSX.Element => {
    const codeEditorFilteredTokens = tokenGroup.filter((group) => {
      return group.id !== 'workflowparameters' && group.id !== 'variables';
    });
    return (
      <TokenPicker
        editorId={editorId}
        labelId={labelId}
        tokenGroup={isCodeEditor ? codeEditorFilteredTokens : tokenGroup}
        expressionGroup={expressionGroup}
        tokenPickerFocused={tokenPickerClicked}
        initialMode={tokenPickerMode}
        getValueSegmentFromToken={(token: OutputToken, addImplicitForeach: boolean) =>
          getValueSegmentFromToken(parameterId, token, addImplicitForeach)
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

      const isCodeEditor = editor?.toLowerCase() === 'code';

      const remappedValues: ValueSegment[] = value.map((v: ValueSegment) => {
        if (v.type !== ValueSegmentType.TOKEN) return v;
        const oldId = v.token?.actionName ?? '';
        const newId = idReplacements[oldId] ?? '';
        if (!newId) return v;
        const remappedValue = v.value?.replace(`'${oldId}'`, `'${newId}'`) ?? '';
        return {
          ...v,
          token: {
            ...v.token,
            remappedValue,
          },
        } as ValueSegment;
      });

      return {
        settingType: 'SettingTokenField',
        settingProp: {
          ...paramSubset,
          readOnly,
          value: remappedValues,
          editor,
          editorOptions,
          tokenEditor: true,
          isTrigger,
          isCallback: nodeType?.toLowerCase() === constants.NODE.TYPE.HTTP_WEBHOOK,
          isLoading: dynamicData?.status === DynamicCallStatus.STARTED,
          errorDetails: dynamicData?.error ? { message: dynamicData.error.message } : undefined,
          validationErrors,
          onValueChange: (newState: ChangeState) => onValueChange(id, newState),
          onComboboxMenuOpen: () => onComboboxMenuOpen(param),
          pickerCallback: () =>
            getFilePickerCallbacks(nodeId, group.id, param, displayNameResult.result, operationInfo, connectionReference, dispatch),
          getTokenPicker: (
            editorId: string,
            labelId: string,
            tokenPickerMode?: TokenPickerMode,
            closeTokenPicker?: () => void,
            tokenPickerClicked?: (b: boolean) => void,
            tokenClickedCallback?: (token: ValueSegment) => void
          ) =>
            getTokenPicker(
              id,
              editorId,
              labelId,
              tokenPickerMode,
              isCodeEditor,
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

export const parametersTab: PanelTab = {
  title: 'Parameters',
  name: constants.PANEL_TAB_NAMES.PARAMETERS,
  description: 'Request History',
  visible: true,
  content: <ParametersTab />,
  order: 0,
  icon: 'Info',
};
