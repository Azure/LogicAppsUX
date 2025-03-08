import type { IdentityDropdownProps } from '../index';
import { IdentityDropdown } from '../index';
import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
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
      handleChange: vi.fn(),
      readOnly: false,
    };
  });

  it('should render', () => {
    const tree = renderer.create(<IdentityDropdown {...minimal} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
