import type { MultiSelectSettingProps, MultiSelectOption } from '../settingmultiselect';
import { MultiSelectSetting } from '../settingmultiselect';
import * as React from 'react';
import { render } from 'react-dom';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/settings/multiselectsettings', () => {
  let minimal: MultiSelectSettingProps, renderer: ReactShallowRenderer.ShallowRenderer, defaultOptions: MultiSelectOption[];

  beforeEach(() => {
    defaultOptions = [
      {
        label: 'Sample Option 1',
        value: 'Sample 1 Value',
      },
      {
        label: 'Sample Option 2',
        value: 'Sample 2 Value',
      },
      {
        label: 'Sample Option 3',
        value: 'Sample 3 Value',
      },
      {
        label: 'Sample Option 4',
        value: 'Sample 4 Value',
      },
    ];

    minimal = {
      options: defaultOptions,
      selections: [],
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct', () => {
    const multiSelectSetting = renderer.render(<MultiSelectSetting {...minimal} />);
    expect(multiSelectSetting).toMatchSnapshot();
  });

  it('should have 4 unchecked checkboxes', () => {
    renderer.render(<MultiSelectSetting {...minimal} />);
    const multiSelectSetting = renderer.getRenderOutput();
    const multiSelectSettingChildren: any[] = React.Children.toArray(multiSelectSetting.props.children);

    expect(multiSelectSettingChildren).toHaveLength(4);
    expect(multiSelectSettingChildren[0].props.checked).toBeFalsy();
    expect(multiSelectSettingChildren[1].props.checked).toBeFalsy();
    expect(multiSelectSettingChildren[2].props.checked).toBeFalsy();
    expect(multiSelectSettingChildren[3].props.checked).toBeFalsy();
  });

  it('should have same number of checkboxes as options', () => {
    const sampleProps: MultiSelectSettingProps = {
      ...minimal,
      options: [...defaultOptions, { label: 'Sample Option 5', value: 'Sample 5 Value' }],
    };
    renderer.render(<MultiSelectSetting {...sampleProps} />);
    const multiSelectSetting = renderer.getRenderOutput();
    const multiSelectSettingChildren: any[] = React.Children.toArray(multiSelectSetting.props.children);

    expect(multiSelectSettingChildren).toHaveLength(5);
  });

  it('should have 3 unchecked and 1 checked checkboxes', () => {
    const sampleProps: MultiSelectSettingProps = { ...minimal, selections: [minimal.options[1]] };
    renderer.render(<MultiSelectSetting {...sampleProps} />);
    const multiSelectSetting = renderer.getRenderOutput();
    const multiSelectSettingChildren: any[] = React.Children.toArray(multiSelectSetting.props.children);

    expect(multiSelectSettingChildren).toHaveLength(4);
    expect(multiSelectSettingChildren[0].props.children.props.checked).toBeFalsy();
    expect(multiSelectSettingChildren[1].props.children.props.checked).toBeTruthy();
    expect(multiSelectSettingChildren[2].props.children.props.checked).toBeFalsy();
    expect(multiSelectSettingChildren[3].props.children.props.checked).toBeFalsy();
  });
});
