import constants from '../../../../common/constants';
import { ProviderWrappedContext } from '../../../../core';
import type { RootState } from '../../../../core/store';
import { getId } from '@fluentui/react';
import type { PanelTab, Settings, SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection } from '@microsoft/designer-ui';
import { useContext } from 'react';
import { useSelector } from 'react-redux';

export const ParametersTab = () => {
  const selectedNode = useSelector((state: RootState) => state.panel.selectedNode);
  const parameters = useSelector((state: RootState) => state.operations.inputParameters[selectedNode]);
  const { readOnly = false } = useContext(ProviderWrappedContext) ?? {};
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
              },
            };
          });
        const settingSectionProps: SettingSectionProps = {
          id: getId(),
          title: sectionName.toUpperCase(),
          expanded: true,
          settings,
        };
        return (
          <div key={id}>
            <SettingsSection {...settingSectionProps} />
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
