import { Assertions, type AssertionsProps } from '../assertions';
import { initializeIcons } from '@fluentui/react';
// biome-ignore lint/correctness/noUnusedImports: actually is used
import React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ui/unitTesting/assertionsPanel/assertions', () => {
  let minimal: AssertionsProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      assertions: [],
      onAssertionAdd: vi.fn(),
      onDismiss: vi.fn(),
      onAssertionDelete: vi.fn(),
      onAssertionUpdate: vi.fn(),
      getConditionExpression: vi.fn(),
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
        assertionString: '@equals(1, 1)',
        id: 'test-id',
        isEditable: true,
      },
      {
        name: 'test-assertion-2',
        description: '',
        assertionString: '@equals(1, 2)',
        id: 'test-id-2',
        isEditable: true,
      },
    ];
    const assertions = renderer.render(<Assertions {...minimal} />);
    expect(assertions).toMatchSnapshot();
  });
});
