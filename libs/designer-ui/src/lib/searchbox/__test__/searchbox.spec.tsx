import React from 'react';
import type { SearchBoxProps } from '..';
import { DesignerSearchBox } from '..';
import renderer from 'react-test-renderer';

import { describe, vi, it, expect } from 'vitest';
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
