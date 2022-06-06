import constants from '../../../common/constants';
import { SettingsPanel } from '../../settings';
import type { PanelTab, SettingSectionProps } from '@microsoft/designer-ui';
import { SettingsSection } from '@microsoft/designer-ui';

export const SettingsTab = () => {
  const settingSectionProps: SettingSectionProps = {
    id: 'this is an ID',
    title: 'Sample Setting Section',
    expanded: false,
    settings: [
      {
        settingType: 'MultiSelectSetting',
        settingProp: {
          options: [
            {
              label: 'Label 1',
              value: 'Label 1 Value',
            },
            {
              label: 'Label 2',
              value: 'Label 2 Value',
            },
            {
              label: 'Label 3',
              value: 'Label 3 Value',
            },
            {
              label: 'Label 4',
              value: 'Label 4 Value',
            },
          ],
          visible: true,
          selections: [],
        },
      },
      {
        settingType: 'SettingTextField',
        settingProp: { visible: true },
      },
      {
        settingType: 'ReactiveToggle',
        settingProp: { textFieldValue: 'This is a test value', textFieldLabel: 'Test Label', visible: true },
      },
      {
        settingType: 'MultiAddExpressionEditor',
        settingProp: { visible: true },
      },
      {
        settingType: 'CustomValueSlider',
        settingProp: { minVal: 10, maxVal: 300, value: 200, visible: true },
      },
      {
        settingType: 'MultiSelectSetting',
        settingProp: {
          options: [
            {
              label: 'Label 1',
              value: 'Label 1 Value',
            },
            {
              label: 'Label 2',
              value: 'Label 2 Value',
            },
            {
              label: 'Label 3',
              value: 'Label 3 Value',
            },
            {
              label: 'Label 4',
              value: 'Label 4 Value',
            },
          ],
          selections: [],
          readOnly: true,
          visible: true,
        },
      },
    ],
  };
  return <SettingsSection {...settingSectionProps} />;
};

export const settingsTab: PanelTab = {
  title: 'Settings',
  name: constants.PANEL_TAB_NAMES.SETTINGS,
  description: 'Request Settings',
  enabled: true,
  content: <SettingsPanel />,
  order: 0,
};
