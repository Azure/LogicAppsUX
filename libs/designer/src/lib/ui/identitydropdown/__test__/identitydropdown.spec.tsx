import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { IdentityDropdown, IdentityDropdownProps } from '..';

describe('ui/identitydropdown', () => {
  const classNames = {
    dropdownContainer: 'msla-identity-dropdown-container',
    dropdownLabel: 'msla-identity-dropdown-label',
  };

  let minimal: IdentityDropdownProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      defaultSelectedKey: 'key1',
      dropdownOptions: [{ key: 'key1', text: 'text1' }],
      handleChange: jest.fn(), // tslint:disable-line: no-empty
      readOnly: false,
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<IdentityDropdown {...minimal} />);

    const identityDropdownContainer = renderer.getRenderOutput();
    expect(identityDropdownContainer.props.className).toBe(classNames.dropdownContainer);

    const [label, dropdown] = React.Children.toArray(identityDropdownContainer.props.children) as React.ReactElement[];

    expect(label).toBeDefined();
    expect(label.props.className).toBe(classNames.dropdownLabel);

    expect(dropdown).toBeDefined();
    expect(dropdown.props.disabled).toBe(minimal.readOnly);
    expect(dropdown.props.options).toBe(minimal.dropdownOptions);
    expect(dropdown.props.defaultSelectedKey).toBe(minimal.defaultSelectedKey);
    expect(dropdown.props.placeholder).toBe('Select a managed identity');
  });
});
