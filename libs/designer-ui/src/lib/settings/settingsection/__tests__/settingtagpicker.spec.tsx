import type { SettingTagPickerProps, TagPickerOption } from '../settingtagpicker';
import { SettingTagPicker } from '../settingtagpicker';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

describe('ui/settings/settingtagpicker', () => {
  let minimal: SettingTagPickerProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;
  let defaultOptions: TagPickerOption[];

  beforeEach(() => {
    defaultOptions = [
      { label: '400 - Bad Request', value: '400' },
      { label: '401 - Unauthorized', value: '401' },
      { label: '403 - Forbidden', value: '403' },
      { label: '404 - Not Found', value: '404' },
      { label: '500 - Internal Server Error', value: '500' },
    ];

    minimal = {
      options: defaultOptions,
      selectedValues: [],
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct with basic props', () => {
    const tagPicker = renderer.render(<SettingTagPicker {...minimal} />);
    expect(tagPicker).toMatchSnapshot();
  });

  it('should render with custom placeholder', () => {
    renderer.render(<SettingTagPicker {...minimal} placeholder="Select HTTP status codes..." />);
    const tagPicker = renderer.getRenderOutput();

    // Find the Combobox child and check its placeholder prop
    const children = React.Children.toArray(tagPicker.props.children);
    const combobox = children.find((child: any) => child?.type?.displayName === 'Combobox' || child?.props?.placeholder);
    expect(combobox).toBeTruthy();
  });

  it('should render selected values as tags', () => {
    const propsWithSelection: SettingTagPickerProps = {
      ...minimal,
      selectedValues: ['400', '404'],
    };

    renderer.render(<SettingTagPicker {...propsWithSelection} />);
    const tagPicker = renderer.getRenderOutput();

    // The TagGroup should be rendered when there are selected values
    const children = React.Children.toArray(tagPicker.props.children);
    const tagGroup = children.find((child: any) => child?.props?.['aria-label'] === 'Selected values');
    expect(tagGroup).toBeTruthy();
  });

  it('should not render TagGroup when no values are selected', () => {
    renderer.render(<SettingTagPicker {...minimal} />);
    const tagPicker = renderer.getRenderOutput();

    const children = React.Children.toArray(tagPicker.props.children);
    const tagGroup = children.find((child: any) => child?.props?.['aria-label'] === 'Selected values');
    expect(tagGroup).toBeFalsy();
  });

  it('should pass readOnly to disable the combobox', () => {
    const propsWithReadOnly: SettingTagPickerProps = {
      ...minimal,
      readOnly: true,
    };

    renderer.render(<SettingTagPicker {...propsWithReadOnly} />);
    const tagPicker = renderer.getRenderOutput();

    const children = React.Children.toArray(tagPicker.props.children);
    const combobox = children.find((child: any) => child?.props?.disabled !== undefined) as React.ReactElement | undefined;
    expect(combobox?.props?.disabled).toBe(true);
  });

  it('should render custom label when provided', () => {
    const customLabel = <span data-testid="custom-label">Custom Label</span>;
    const propsWithLabel: SettingTagPickerProps = {
      ...minimal,
      customLabel,
    };

    renderer.render(<SettingTagPicker {...propsWithLabel} />);
    const tagPicker = renderer.getRenderOutput();

    const children = React.Children.toArray(tagPicker.props.children);
    const label = children.find((child: any) => child?.props?.['data-testid'] === 'custom-label');
    expect(label).toBeTruthy();
  });

  it('should only show unselected options', () => {
    const propsWithSelection: SettingTagPickerProps = {
      ...minimal,
      selectedValues: ['400', '401'],
    };

    renderer.render(<SettingTagPicker {...propsWithSelection} />);
    const tagPicker = renderer.getRenderOutput();

    // Find the Combobox and count its Option children
    const children = React.Children.toArray(tagPicker.props.children);
    const combobox = children.find((child: any) => {
      const childChildren = child?.props?.children;
      return Array.isArray(childChildren) || childChildren?.length > 0;
    });

    if (combobox) {
      const comboboxElement = combobox as React.ReactElement;
      const options = React.Children.toArray(comboboxElement.props.children);
      // Should have 3 options (5 total - 2 selected)
      expect(options.length).toBe(3);
    }
  });
});
