import constants from '../../../../common/constants';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import type { ParameterGroup } from '../../../../core/state/operation/operationMetadataSlice';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { showTokenPicker, hideTokenPicker } from '../../../../core/state/panel/panelSlice';
import {
  useAllowUserToChangeConnection,
  useNodeConnectionName,
  useOperationInfo,
} from '../../../../core/state/selectors/actionMetadataSelector';
import type { VariableDeclaration } from '../../../../core/state/tokensSlice';
import { updateVariableInfo } from '../../../../core/state/tokensSlice';
import type { AppDispatch, RootState } from '../../../../core/store';
import { getConnectionReference } from '../../../../core/utils/connectors/connections';
import { isRootNodeInGraph } from '../../../../core/utils/graph';
import { addForeachToNode } from '../../../../core/utils/loops';
import { loadDynamicValuesForParameter, updateParameterAndDependencies } from '../../../../core/utils/parameters/helper';
import type { TokenGroup } from '../../../../core/utils/tokens';
import { createValueSegmentFromToken, getExpressionTokenSections, getOutputTokenSections } from '../../../../core/utils/tokens';
import { getAllVariables, getAvailableVariables } from '../../../../core/utils/variables';
import { SettingsSection } from '../../../settings/settingsection';
import type { Settings } from '../../../settings/settingsection';
import { ConnectionDisplay } from './connectionDisplay';
import { equals } from '@microsoft-logic-apps/utils';
import { DynamicCallStatus, TokenPicker } from '@microsoft/designer-ui';
import type { ChangeState, PanelTab, ParameterInfo, ValueSegment, OutputToken } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const ParametersTab = () => {
  const selectedNodeId = useSelectedNodeId();
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

  const tokenGroup = getOutputTokenSections(selectedNodeId, nodeType, tokenState, workflowParametersState);
  const expressionGroup = getExpressionTokenSections();

  return (
    <>
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
  const {
    isTrigger,
    nodeInputs,
    operationInfo,
    dependencies,
    settings: nodeSettings,
    variables,
    upstreamNodeIds,
    operationDefinition,
    connectionReference,
    tokenPickerVisibility,
  } = useSelector((state: RootState) => {
    return {
      isTrigger: isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata),
      nodeInputs: state.operations.inputParameters[nodeId],
      operationInfo: state.operations.operationInfo[nodeId],
      dependencies: state.operations.dependencies[nodeId],
      settings: state.operations.settings[nodeId],
      upstreamNodeIds: state.tokens.outputTokens[nodeId]?.upstreamNodeIds,
      variables: state.tokens.variables,
      operationDefinition: state.workflow.newlyAddedOperations[nodeId] ? undefined : state.workflow.operations[nodeId],
      connectionReference: getConnectionReference(state.connections, nodeId),
      tokenPickerVisibility: state.panel.tokenPickerVisibility,
    };
  });
  const rootState = useSelector((state: RootState) => state);

  const showTokenPickerSwitch = (show?: boolean) => {
    if (show) {
      dispatch(showTokenPicker());
    } else {
      if (tokenPickerVisibility) {
        dispatch(hideTokenPicker());
      } else {
        dispatch(showTokenPicker());
      }
    }
  };

  const onValueChange = useCallback(
    (id: string, newState: ChangeState) => {
      const { value, viewModel } = newState;
      const propertiesToUpdate = { value, preservedValue: undefined } as Partial<ParameterInfo>;

      if (viewModel !== undefined) {
        propertiesToUpdate.editorViewModel = viewModel;
      }
      const parameter = nodeInputs.parameterGroups[group.id].parameters.find((param) => param.id === id);
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
        dispatch
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
    tokenPickerFocused?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void,
    tokenPickerHide?: () => void
  ): JSX.Element => {
    // check to see if there's a custom Token Picker
    return (
      <TokenPicker
        editorId={editorId}
        labelId={labelId}
        tokenGroup={tokenGroup}
        expressionGroup={expressionGroup}
        tokenPickerFocused={tokenPickerFocused}
        getValueSegmentFromToken={(token: OutputToken, addImplicitForeach: boolean) =>
          getValueSegmentFromToken(parameterId, token, addImplicitForeach)
        }
        tokenClickedCallback={tokenClicked}
        tokenPickerHide={tokenPickerHide}
        showTokenPickerSwitch={showTokenPickerSwitch}
      />
    );
  };

  const settings: Settings[] = group?.parameters
    .filter((x) => !x.hideInUI)
    .map((param) => {
      const { editor, editorOptions } = getEditorAndOptions(param, upstreamNodeIds ?? [], variables);
      return {
        settingType: 'SettingTokenField',
        settingProp: {
          readOnly,
          id: param.id,
          label: param.label,
          value: param.value,
          required: param.required,
          editor,
          editorOptions,
          editorViewModel: param.editorViewModel,
          placeholder: param.placeholder,
          tokenEditor: true,
          isTrigger: isTrigger,
          isLoading: param.dynamicData?.status === DynamicCallStatus.STARTED,
          errorDetails: param.dynamicData?.error ? { message: param.dynamicData.error.message } : undefined,
          showTokens: param.showTokens,
          onValueChange: (newState: ChangeState) => onValueChange(param.id, newState),
          onComboboxMenuOpen: () => onComboboxMenuOpen(param),
          tokenPickerHandler: {
            getTokenPicker: (
              editorId: string,
              labelId: string,
              tokenPickerFocused?: (b: boolean) => void,
              tokenClicked?: (token: ValueSegment) => void
            ) => getTokenPicker(param.id, editorId, labelId, tokenPickerFocused, tokenClicked),
            tokenPickerProps: { tokenPickerVisibility, showTokenPickerSwitch },
          },
        },
      };
    });

  return (
    <SettingsSection id={group.id} title={group.description} settings={settings} showHeading={!!group.description} showSeparator={false} />
  );
};

const getEditorAndOptions = (
  parameter: ParameterInfo,
  upstreamNodeIds: string[],
  variables: Record<string, VariableDeclaration[]>
): { editor?: string; editorOptions?: any } => {
  const { editor, editorOptions } = parameter;
  if (equals(editor, 'variablename')) {
    return {
      editor: 'dropdown',
      editorOptions: {
        options: getAvailableVariables(variables, upstreamNodeIds).map((variable) => ({
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
