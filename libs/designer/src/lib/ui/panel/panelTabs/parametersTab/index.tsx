import constants from '../../../../common/constants';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import type { ParameterGroup } from '../../../../core/state/operation/operationMetadataSlice';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useNodeConnectionName } from '../../../../core/state/selectors/actionMetadataSelector';
import type { RootState } from '../../../../core/store';
import { getConnectionId } from '../../../../core/utils/connectors/connections';
import { isRootNodeInGraph } from '../../../../core/utils/graph';
import { loadDynamicValuesForParameter, updateParameterAndDependencies } from '../../../../core/utils/parameters/helper';
import type { TokenGroup } from '../../../../core/utils/tokens';
import { getExpressionTokenSections, getOutputTokenSections } from '../../../../core/utils/tokens';
import { getAllVariables } from '../../../../core/utils/variables';
import { SettingsSection } from '../../../settings/settingsection';
import type { Settings } from '../../../settings/settingsection';
import { ConnectionDisplay } from './connectionDisplay';
import { DynamicCallStatus, TokenPicker } from '@microsoft/designer-ui';
import type { ChangeState, PanelTab, ParameterInfo } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const ParametersTab = () => {
  const selectedNodeId = useSelectedNodeId();
  const inputs = useSelector((state: RootState) => state.operations.inputParameters[selectedNodeId]);
  const tokenstate = useSelector((state: RootState) => state.tokens);
  const nodeType = useSelector((state: RootState) => state.operations.operationInfo[selectedNodeId]?.type);
  const readOnly = useReadOnly();

  const connectionName = useNodeConnectionName(selectedNodeId);

  const tokenGroup = getOutputTokenSections(tokenstate, selectedNodeId, nodeType);

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
      {connectionName?.result && <ConnectionDisplay connectionName={connectionName.result} nodeId={selectedNodeId} />}
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
  const dispatch = useDispatch();
  const {
    isTrigger,
    nodeInputs,
    operationInfo,
    connectionId,
    dependencies,
    settings: nodeSettings,
    variables,
  } = useSelector((state: RootState) => {
    return {
      isTrigger: isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata),
      nodeInputs: state.operations.inputParameters[nodeId],
      operationInfo: state.operations.operationInfo[nodeId],
      connectionId: getConnectionId(state.connections, nodeId),
      dependencies: state.operations.dependencies[nodeId],
      settings: state.operations.settings[nodeId],
      variables: getAllVariables(state.tokens.variables),
    };
  });

  const onValueChange = useCallback(
    (id: string, newState: ChangeState) => {
      const { value, viewModel } = newState;
      const propertiesToUpdate = { value, preservedValue: undefined } as Partial<ParameterInfo>;

      if (viewModel !== undefined) {
        propertiesToUpdate.editorViewModel = viewModel;
      }

      updateParameterAndDependencies(
        nodeId,
        group.id,
        id,
        propertiesToUpdate,
        isTrigger,
        operationInfo,
        connectionId,
        nodeInputs,
        dependencies,
        variables,
        nodeSettings,
        dispatch
      );
    },
    [nodeId, group.id, isTrigger, operationInfo, connectionId, nodeInputs, dependencies, variables, nodeSettings, dispatch]
  );

  const onComboboxMenuOpen = (parameter: ParameterInfo): void => {
    if (parameter.dynamicData?.status === DynamicCallStatus.FAILED || parameter.dynamicData?.status === DynamicCallStatus.NOTSTARTED) {
      loadDynamicValuesForParameter(nodeId, group.id, parameter.id, operationInfo, connectionId, nodeInputs, dependencies, dispatch);
    }
  };

  const GetTokenPicker = (
    editorId: string,
    labelId: string,
    tokenPickerFocused?: (b: boolean) => void,
    setShowTokenPickerButton?: (b: boolean) => void
  ): JSX.Element => {
    // check to see if there's a custom Token Picker
    return (
      <TokenPicker
        editorId={editorId}
        labelId={labelId}
        tokenGroup={tokenGroup}
        expressionGroup={expressionGroup}
        tokenPickerFocused={tokenPickerFocused}
        setShowTokenPickerButton={setShowTokenPickerButton}
      />
    );
  };

  const settings: Settings[] = group?.parameters
    .filter((x) => !x.hideInUI)
    .map((param) => {
      return {
        settingType: 'SettingTokenField',
        settingProp: {
          readOnly,
          id: param.id,
          label: param.label,
          value: param.value,
          required: param.required,
          editor: param.editor,
          editorOptions: param.editorOptions,
          editorViewModel: param.editorViewModel,
          placeholder: param.placeholder,
          tokenEditor: true,
          GetTokenPicker: GetTokenPicker,
          onValueChange: (newState: ChangeState) => onValueChange(param.id, newState),
          onComboboxMenuOpen: () => onComboboxMenuOpen(param),
        },
      };
    });

  return (
    <SettingsSection id={group.id} title={group.description} settings={settings} showHeading={!!group.description} showSeparator={false} />
  );
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
