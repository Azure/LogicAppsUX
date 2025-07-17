import React from 'react';
import type { SearchableDropdownWithAddAllProps } from '..';
import { SearchableDropdownWithAddAll } from '..';
import renderer from 'react-test-renderer';
import { describe, vi, it, expect } from 'vitest';

describe('SearchableDropdownWithAddAll', () => {
  it('renders a dropdown with both Add All and Remove All buttons', () => {
    const props: SearchableDropdownWithAddAllProps = {
      multiselect: true,
      placeholder: 'Select an option',
      options: [
        { key: 'foo', text: 'Foo' },
        { key: 'bar', text: 'Bar' },
        { key: 'baz', text: 'Baz' },
      ],
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

    const rendered = renderer.create(<SearchableDropdownWithAddAll {...props} />).toJSON();
    expect(rendered).toMatchSnapshot();
  });

  it('renders a dropdown with only Add All button', () => {
    const props: SearchableDropdownWithAddAllProps = {
      multiselect: true,
      placeholder: 'Select an option',
      options: [
        { key: 'foo', text: 'Foo' },
        { key: 'bar', text: 'Bar' },
        { key: 'baz', text: 'Baz' },
      ],
      onItemSelectionChanged: vi.fn(),
      addAllButtonText: 'Add all',
      addAllButtonTooltip: 'Add all tooltip',
      addAllButtonEnabled: true,
      onShowAllClick: vi.fn(),
    };

    const rendered = renderer.create(<SearchableDropdownWithAddAll {...props} />).toJSON();
    expect(rendered).toMatchSnapshot();
  });
});
