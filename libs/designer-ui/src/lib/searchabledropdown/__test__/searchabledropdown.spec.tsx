import React from 'react';
import type { SearchableDropdownProps } from '..';
import { SearchableDropdown } from '..';
import renderer from 'react-test-renderer';
import { describe, vi, it, expect } from 'vitest';

describe('SearchableDropdown', () => {
  it('should render dropdown without a search box when options.length < threshold', () => {
    const props: SearchableDropdownProps = {
      multiselect: true,
      placeholder: 'Select an option',
      options: [
        { key: 'foo', text: 'Foo' },
        { key: 'bar', text: 'Bar' },
        { key: 'baz', text: 'Baz' },
      ],
      onItemSelectionChanged: vi.fn(),
      showSearchItemThreshold: 4, // default anyway, but explicit here
    };

    const tree = renderer.create(<SearchableDropdown {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render dropdown with a search box when options.length >= threshold', () => {
    const props: SearchableDropdownProps = {
      multiselect: true,
      placeholder: 'Select an option',
      options: [
        { key: 'foo', text: 'Foo' },
        { key: 'bar', text: 'Bar' },
        { key: 'baz', text: 'Baz' },
        { key: 'qux', text: 'Qux' },
        { key: 'qoz', text: 'Qoz' },
      ],
      onItemSelectionChanged: vi.fn(),
      showSearchItemThreshold: 4,
    };

    const tree = renderer.create(<SearchableDropdown {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
