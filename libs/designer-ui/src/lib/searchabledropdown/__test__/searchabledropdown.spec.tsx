import type { SearchableDropdownProps } from '..';
import { SearchableDropdown } from '..';
import renderer from 'react-test-renderer';

// vi.mock('@fluentui/react', () => ({
//   ...vi.requireActual('@fluentui/react'),
//   Dropdown: 'Dropdown',
// }));
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/searchabledropdown', () => {
  it('should create a dropdown without a search box for 3 options', () => {
    const props: SearchableDropdownProps = {
      dropdownProps: {
        multiSelect: true,
        placeholder: 'Select an option',
        options: [
          { key: 'foo', text: 'Foo' },
          { key: 'bar', text: 'Bar' },
          { key: 'baz', text: 'Baz' },
        ],
      },
      onItemSelectionChanged: vi.fn(),
    };
    const component = <SearchableDropdown {...props} />;
    const renderedComponent = renderer.create(component).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });

  it('should create a dropdown with a search box for 5 options', () => {
    const props: SearchableDropdownProps = {
      dropdownProps: {
        multiSelect: true,
        placeholder: 'Select an option',
        options: [
          { key: 'foo', text: 'Foo' },
          { key: 'bar', text: 'Bar' },
          { key: 'baz', text: 'Baz' },
          { key: 'qux', text: 'Qux' },
          { key: 'qoz', text: 'Qoz' },
        ],
      },
      onItemSelectionChanged: vi.fn(),
    };
    const component = <SearchableDropdown {...props} />;
    const renderedComponent = renderer.create(component).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });
});
