import { Assertions, type AssertionsProps } from '../assertions';
import { initializeIcons } from '@fluentui/react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, beforeEach, afterEach, it, vi, expect } from 'vitest';
import React from 'react';

describe('ui/unitTesting/assertionsPanel/assertions', () => {
  let minimal: AssertionsProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      assertions: [],
      onAssertionAdd: vi.fn(),
      onDismiss: vi.fn(),
      onAssertionDelete: vi.fn(),
      onAssertionUpdate: vi.fn(),
      getTokenPicker: vi.fn(),
      tokenMapping: {},
      loadParameterValueFromString: vi.fn(),
      validationErrors: {},
    };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render without assertions items and add button.', () => {
    const assertions = renderer.render(<Assertions {...minimal} />);
    expect(assertions).toMatchSnapshot();
  });

  it('should render list of assertions and add button', () => {
    minimal.assertions = [
      {
        name: 'test-assertion',
        description: 'test-description',
        expression: {
          items: {
            type: 'group',
            items: [],
          },
        },
        id: 'test-id',
        isEditable: true,
      },
      {
        name: 'test-assertion-2',
        description: '',
        expression: {
          items: {
            type: 'group',
            items: [],
          },
        },
        id: 'test-id-2',
        isEditable: true,
      },
    ];
    const assertions = renderer.render(<Assertions {...minimal} />);
    expect(assertions).toMatchSnapshot();
  });
});
