import React from 'react';
import type { SearchBoxProps } from '..';
import { DesignerSearchBox } from '..';
import renderer from 'react-test-renderer';

// vi.mock('@fluentui/react', () => ({
//   ...vi.requireActual('@fluentui/react'),
//   Dropdown: 'Dropdown',
// }));
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/searchabledropdownwithaddall', () => {
  it('should render a search box', () => {
    const props: SearchBoxProps = {
      searchTerm: 'foo',
      searchCallback: vi.fn(),
    };
    const component = <DesignerSearchBox {...props} />;
    const renderedComponent = renderer.create(component).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });
});
