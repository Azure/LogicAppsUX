import constants from '../../../../common/constants';
import { useReadOnly } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import type { RootState } from '../../../../core/store';
import { SettingsSection } from '../../../settings/settingsection';
import type { Settings } from '../../../settings/settingsection';
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
        const parameterGroup = parameters.parameterGroups[sectionName];
        const settings: Settings[] = parameterGroup?.parameters
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
            <SettingsSection
              id={getId()}
              title={parameterGroup.description}
              settings={settings}
              showHeading={!!parameterGroup.description}
            />
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
  visible: true,
  content: <ParametersTab />,
  order: 0,
  icon: 'Info',
};
