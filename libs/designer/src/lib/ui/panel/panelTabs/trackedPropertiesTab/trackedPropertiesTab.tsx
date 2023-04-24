import constants from '../../../../common/constants';
import type { TrackedProperty } from '../../../../core/state/designerOptions/designerOptionsInterfaces';
import { useReadOnly, useTrackedProperties } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useOperationInfo } from '../../../../core/state/selectors/actionMetadataSelector';
import { useNodeMetadata, useReplacedIds } from '../../../../core/state/workflow/workflowSelectors';
import type { AppDispatch, RootState } from '../../../../core/store';
import { isRootNodeInGraph } from '../../../../core/utils/graph';
import { addForeachToNode } from '../../../../core/utils/loops';
import type { TokenGroup } from '../../../../core/utils/tokens';
import { createValueSegmentFromToken, getExpressionTokenSections, getOutputTokenSections } from '../../../../core/utils/tokens';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { SettingTokenField, TokenPicker } from '@microsoft/designer-ui';
import type { PanelTab, ValueSegment, OutputToken, TokenPickerMode, SettingTokenTextFieldProps } from '@microsoft/designer-ui';
import { useDispatch, useSelector } from 'react-redux';

export const TrackedPropertiesTab = () => {
  const selectedNodeId = useSelectedNodeId();
  const trackedProperties = useTrackedProperties();
  if (!trackedProperties) {
    throw Error('Tracked properties not found');
  }
  const nodeMetadata = useNodeMetadata(selectedNodeId);
  const { tokenState, workflowParametersState } = useSelector((state: RootState) => ({
    tokenState: state.tokens,
    workflowParametersState: state.workflowParameters,
  }));
  const nodeType = useSelector((state: RootState) => state.operations.operationInfo[selectedNodeId]?.type);
  const readOnly = useReadOnly();

  const operationInfo = useOperationInfo(selectedNodeId);

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
    <div>
      <TrackedPropertiesSection
        key={selectedNodeId}
        nodeId={selectedNodeId}
        nodeType={nodeType}
        trackedProperties={trackedProperties}
        readOnly={readOnly}
        tokenGroup={tokenGroup}
        expressionGroup={expressionGroup}
      />
    </div>
  );
};

const TrackedPropertiesSection = ({
  nodeId,
  nodeType,
  trackedProperties,
  readOnly,
  tokenGroup,
  expressionGroup,
}: {
  nodeId: string;
  nodeType?: string;
  trackedProperties: TrackedProperty[];
  readOnly: boolean | undefined;
  tokenGroup: TokenGroup[];
  expressionGroup: TokenGroup[];
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isTrigger } = useSelector((state: RootState) => {
    return {
      isTrigger: isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata),
      // nodeInputs: state.operations.inputParameters[nodeId],
      // nodeMetadata: state.operations.actionMetadata[nodeId],
      //operationInfo: state.operations.operationInfo[nodeId],
      //dependencies: state.operations.dependencies[nodeId],
      //settings: state.operations.settings[nodeId],
      //upstreamNodeIds: state.tokens.outputTokens[nodeId]?.upstreamNodeIds,
      //variables: state.tokens.variables,
      //operationDefinition: state.workflow.newlyAddedOperations[nodeId] ? undefined : state.workflow.operations[nodeId],
      // connectionReference: getConnectionReference(state.connections, nodeId),
      // idReplacements: state.workflow.idReplacements,
    };
  });
  const rootState = useSelector((state: RootState) => state);

  // const onValueChange = useCallback(
  //   (id: string, newState: ChangeState) => {
  //     let { value } = newState;
  //     const { viewModel } = newState;
  //     const parameter = nodeInputs.parameterGroups[group.id].parameters.find((param: any) => param.id === id);
  //     if (
  //       (parameter?.type === constants.SWAGGER.TYPE.BOOLEAN && value.length === 1 && value[0]?.value === 'True') ||
  //       value[0]?.value === 'False'
  //     ) {
  //       value = [{ ...value[0], value: value[0].value.toLowerCase() }];
  //     }

  //     const propertiesToUpdate = { value, preservedValue: undefined } as Partial<ParameterInfo>;

  //     if (viewModel !== undefined) {
  //       propertiesToUpdate.editorViewModel = viewModel;
  //     }
  //     if (variables[nodeId] && (parameter?.parameterKey === 'inputs.$.name' || parameter?.parameterKey === 'inputs.$.type')) {
  //       dispatch(updateVariableInfo({ id: nodeId, name: value[0]?.value }));
  //     }

  //     updateParameterAndDependencies(
  //       nodeId,
  //       group.id,
  //       id,
  //       propertiesToUpdate,
  //       isTrigger,
  //       operationInfo,
  //       connectionReference,
  //       nodeInputs,
  //       nodeMetadata,
  //       dependencies,
  //       getAllVariables(variables),
  //       nodeSettings,
  //       dispatch,
  //       rootState,
  //       operationDefinition
  //     );
  //   },
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   [
  //     nodeId,
  //     group.id,
  //     isTrigger,
  //     operationInfo,
  //     connectionReference,
  //     nodeInputs,
  //     dependencies,
  //     variables,
  //     nodeSettings,
  //     dispatch,
  //     operationDefinition,
  //   ]
  // );

  const getValueSegmentFromToken = async (
    token: OutputToken,
    addImplicitForeachIfNeeded: boolean,
    parameterId?: string
  ): Promise<ValueSegment> => {
    const { segment, foreachDetails } = await createValueSegmentFromToken(
      nodeId,
      token,
      addImplicitForeachIfNeeded,
      rootState,
      parameterId
    );
    if (foreachDetails) {
      dispatch(addForeachToNode({ arrayName: foreachDetails.arrayValue, nodeId, token }));
    }

    return segment;
  };

  const getTokenPicker = (
    editorId: string,
    labelId: string,
    tokenPickerMode?: TokenPickerMode,
    parameterId?: string,
    closeTokenPicker?: () => void,
    tokenPickerClicked?: (b: boolean) => void,
    tokenClickedCallback?: (token: ValueSegment) => void
  ): JSX.Element => {
    return (
      <TokenPicker
        editorId={editorId}
        labelId={labelId}
        tokenGroup={tokenGroup}
        expressionGroup={expressionGroup}
        tokenPickerFocused={tokenPickerClicked}
        initialMode={tokenPickerMode}
        getValueSegmentFromToken={(token: OutputToken, addImplicitForeach: boolean) =>
          getValueSegmentFromToken(token, addImplicitForeach, parameterId)
        }
        tokenClickedCallback={tokenClickedCallback}
        closeTokenPicker={closeTokenPicker}
      />
    );
  };

  const fieldProps: SettingTokenTextFieldProps[] = trackedProperties?.map((trackedProperty) => {
    const { name: label } = trackedProperty;
    const placeholder = 'Enter value';

    return {
      label,
      placeholder,
      showTokens: true,
      readOnly,
      value: [],
      //Don't pass: editor,
      tokenEditor: true,
      isTrigger,
      isCallback: nodeType?.toLowerCase() === constants.NODE.TYPE.HTTP_WEBHOOK,
      getTokenPicker: (
        editorId: string,
        labelId: string,
        tokenPickerMode?: TokenPickerMode,
        closeTokenPicker?: () => void,
        tokenPickerClicked?: (b: boolean) => void,
        tokenClickedCallback?: (token: ValueSegment) => void
      ) => getTokenPicker(editorId, labelId, tokenPickerMode, undefined, closeTokenPicker, tokenPickerClicked, tokenClickedCallback),
    };
  });

  return (
    <>
      {fieldProps.map((fieldProp, i) => (
        <SettingTokenField
          {...{
            ...fieldProp,
            useFormLabel: true,
          }}
          key={`property-${i}`}
        />
      ))}
    </>
  );
};

export const trackedPropertiesTab: PanelTab = {
  title: 'Tracked Properties',
  name: constants.PANEL_TAB_NAMES.TRACKED_PROPERTIES,
  description: 'Tracked Properties',
  visible: true,
  content: <TrackedPropertiesTab />,
  order: 0,
};
