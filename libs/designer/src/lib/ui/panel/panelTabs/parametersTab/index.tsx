import constants from '../../../../common/constants';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import type { ParameterGroup } from '../../../../core/state/operation/operationMetadataSlice';
import { updateNodeParameter } from '../../../../core/state/operation/operationMetadataSlice';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { useNodeConnectionName } from '../../../../core/state/selectors/actionMetadataSelector';
import type { RootState } from '../../../../core/store';
import { SettingsSection } from '../../../settings/settingsection';
import type { Settings } from '../../../settings/settingsection';
import { ConnectionDisplay } from './connectionDisplay';
import type { ChangeState, PanelTab, ParameterInfo } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const ParametersTab = () => {
  const selectedNodeId = useSelectedNodeId();
  const parameters = useSelector((state: RootState) => state.operations.inputParameters[selectedNodeId]);
  const readOnly = useReadOnly();

  const connectionName = useNodeConnectionName(selectedNodeId);

  return (
    <>
      {Object.keys(parameters?.parameterGroups ?? {}).map((sectionName) => (
        <div key={sectionName}>
          <ParameterSection nodeId={selectedNodeId} group={parameters.parameterGroups[sectionName]} readOnly={readOnly} />
        </div>
      ))}
      {connectionName && <ConnectionDisplay connectionName={connectionName.result} nodeId={selectedNodeId} />}
    </>
  );
};

const ParameterSection = ({ nodeId, group, readOnly }: { nodeId: string; group: ParameterGroup; readOnly: boolean | undefined }) => {
  const dispatch = useDispatch();

  const onValueChange = useCallback(
    (id: string, newState: ChangeState) => {
      const { value, viewModel } = newState;
      const propertiesToUpdate = { value } as Partial<ParameterInfo>;

      if (viewModel !== undefined) {
        propertiesToUpdate.editorViewModel = viewModel;
      }

      dispatch(
        updateNodeParameter({
          nodeId,
          groupId: group.id,
          parameterId: id,
          propertiesToUpdate,
        })
      );
    },
    [nodeId, group.id, dispatch]
  );

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
          onValueChange: (newState: ChangeState) => onValueChange(param.id, newState),
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
