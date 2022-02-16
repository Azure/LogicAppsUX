import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import { IdentityDropdown, IdentityDropdownProps } from '../index';

describe('lib/identitydropdown', () => {
  let minimal: IdentityDropdownProps;

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    minimal = {
      defaultSelectedKey: 'key1',
      dropdownOptions: [{ key: 'key1', text: 'text1' }],
      handleChange: jest.fn(),
      readOnly: false,
    };
  });

  it('should render', () => {
    const tree = renderer.create(<IdentityDropdown {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
