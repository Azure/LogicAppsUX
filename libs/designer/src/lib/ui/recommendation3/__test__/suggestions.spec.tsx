import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Suggestions, SuggestionsProps } from '../suggestions';

describe('ui/recommendation3/_suggestions', () => {
  const classNames = {
    suggestions: 'msla-suggestions',
  };

  let minimal: SuggestionsProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      visible: true,
      suggestedItems: [],
      onConnectorClick: jest.fn(),
      onOperationClick: jest.fn(),
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render suggestions component correctly', () => {
    renderer.render(<Suggestions {...minimal} />);

    const suggestion = renderer.getRenderOutput();
    expect(suggestion.props.className).toBe(classNames.suggestions);
  });
});
