import constants from '../../../../common/constants';
import { useReadOnly } from '../../../../core/state/selectors/designerOptionsSelector';
import type { RootState } from '../../../../core/store';
import { SettingsSection } from '../../../settings/sections';
import type { Settings } from '../../../settings/sections';
import { getId } from '@fluentui/react';
import type { PanelTab } from '@microsoft/designer-ui';
import { useSelector } from 'react-redux';

export const ParametersTab = () => {
  const selectedNode = useSelector((state: RootState) => state.panel.selectedNode);
  const parameters = useSelector((state: RootState) => state.operations.inputParameters[selectedNode]);
  const readOnly = useReadOnly();

  return (
    <>
      {Object.keys(parameters?.parameterGroups ?? {}).map((sectionName) => {
        const id = getId();
        const settings: Settings[] = parameters.parameterGroups[sectionName]?.parameters
          .filter((x) => !x.hideInUI)
          .map((param) => {
            return {
              settingType: 'SettingTokenTextField',
              settingProp: {
                readOnly,
                id: param.id,
                label: param.label,
                tokenEditor: true,
                value: param.value,
                required: param.required,
              },
            };
          });
        return (
          <div key={id}>
            <SettingsSection id={getId()} title={sectionName} settings={settings} showHeading={false} />
          </div>
        );
      })}
    </>
  );
};

export const parametersTab: PanelTab = {
  title: 'Parameters',
  name: constants.PANEL_TAB_NAMES.PARAMETERS,
  description: 'Request History',
  enabled: true,
  content: <ParametersTab />,
  order: 0,
  icon: 'Info',
};
