import { SettingsSection } from '../settingsection';
import type { SettingSectionProps } from '../settingsection';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/settings/settingsection', () => {
  let minimal: SettingSectionProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
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
            selections: [],
          },
          visible: true,
        },
        {
          settingType: 'SettingTextField',
          settingProp: {
            label: 'test label',
            value: 'test value',
          },
          visible: true,
        },
        {
          settingType: 'ReactiveToggle',
          settingProp: {
            textFieldValue: 'This is a test value',
            textFieldLabel: 'Test Label',
            onToggleLabel: 'On',
            offToggleLabel: 'Off',
          },
          visible: true,
        },
        {
          settingType: 'MultiAddExpressionEditor',
          settingProp: { onExpressionsChange: () => console.log('function not implemented') },
          visible: true,
        },
        {
          settingType: 'CustomValueSlider',
          settingProp: { minVal: 10, maxVal: 300, value: 200, sliderLabel: 'Slider', onValueChange: () => null },
          visible: true,
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
          },
          visible: true,
        },
      ],
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct', () => {
    const settingSection = renderer.render(<SettingsSection {...minimal} />);
    expect(settingSection).toMatchSnapshot();
  });

  it('should have child section when expanded', () => {
    const props: SettingSectionProps = { ...minimal, expanded: true };
    renderer.render(<SettingsSection {...props} />);

    const settingSection = renderer.getRenderOutput();
    expect(settingSection.props.className).toBe('msla-setting-section');

    const settingSectionChild = settingSection.props.children;
    expect(settingSectionChild.props.className).toBe('msla-setting-section-content');
  });
});
