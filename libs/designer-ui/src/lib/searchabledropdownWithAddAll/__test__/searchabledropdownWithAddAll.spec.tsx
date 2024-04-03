import type { SearchableDropdownWithAddAllProps } from '..';
import { SearchableDropdownWithAddAll } from '..';
import renderer from 'react-test-renderer';

// vi.mock('@fluentui/react', () => ({
//   ...vi.requireActual('@fluentui/react'),
//   Dropdown: 'Dropdown',
// }));

describe('lib/searchabledropdownwithaddall', () => {
  it('should create a dropdown with an add all and remove all buttons', () => {
    const props: SearchableDropdownWithAddAllProps = {
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
      addAllButtonText: 'Add all',
      addAllButtonTooltip: 'Add all tooltip',
      addAllButtonEnabled: true,
      removeAllButtonText: 'Remove all',
      removeAllButtonTooltip: 'Remove all tooltip',
      removeAllButtonEnabled: true,
      onShowAllClick: vi.fn(),
      onHideAllClick: vi.fn(),
    };
    const component = <SearchableDropdownWithAddAll {...props} />;
    const renderedComponent = renderer.create(component).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });
});

describe('lib/searchabledropdownwithaddall', () => {
  it('should create a dropdown with an add all only', () => {
    const props: SearchableDropdownWithAddAllProps = {
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
      addAllButtonText: 'Add all',
      addAllButtonTooltip: 'Add all tooltip',
      addAllButtonEnabled: true,
      onShowAllClick: vi.fn(),
    };
    const component = <SearchableDropdownWithAddAll {...props} />;
    const renderedComponent = renderer.create(component).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });
});
