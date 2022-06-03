import constants from '../../../../common/constants';
import { ProviderWrappedContext } from '../../../../core';
import type { RootState } from '../../../../core/store';
import type { PanelTab, SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection } from '@microsoft/designer-ui';
import { useContext } from 'react';
import { useSelector } from 'react-redux';

export const ParametersTab = () => {
  // TODO: Retrieve logic from a redux store?
  const selectedNode = useSelector((state: RootState) => state.panel.selectedNode);
  const parameters = useSelector((state: RootState) => state.operations.inputParameters[selectedNode]);
  const { readOnly } = useContext(ProviderWrappedContext) ?? {};
  if (parameters?.isLoading) {
    return <div>Loading</div>;
  }

  return (
    <>
      {Object.keys(parameters?.parameterGroups ?? {}).map((key) => {
        const settingSectionProps: SettingSectionProps = {
          id: 'defaultID',
          title: 'Default',
          expanded: false,
          settings: parameters.parameterGroups[key]?.parameters.map((param) => {
            return {
              settingType: 'SettingTextField',
              settingProp: {
                readOnly,
                id: param.id,
                label: param.label,
                value: param.value,
              },
            };
          }),
        };
        return (
          <>
            {key === 'default' ? null : <h3>{key}</h3>}
            <SettingsSection {...settingSectionProps} />
          </>
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
