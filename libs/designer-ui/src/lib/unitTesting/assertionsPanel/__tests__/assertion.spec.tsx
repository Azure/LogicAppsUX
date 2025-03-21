// biome-ignore lint/correctness/noUnusedImports: actually is used
import React from 'react';
import { Assertion, type AssertionProps } from '../index';
import { initializeIcons } from '@fluentui/react';
import TestRenderer from 'react-test-renderer';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ui/unitTesting/assertionsPanel/assertion', () => {
  let minimal: AssertionProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      id: 'test-id',
      assertion: {
        id: 'test-id',
        name: 'test-name',
        description: 'test-description',
        assertionString: '@equals(1, 1)',
        isEditable: true,
      },
      onAssertionDelete: vi.fn(),
      onAssertionUpdate: vi.fn(),
      getConditionExpression: vi.fn(),
      validationErrors: {},
      isInverted: false,
    };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render the component as editable with light theme.', () => {
    const assertion = TestRenderer.create(<Assertion {...minimal} />);
    expect(assertion).toMatchSnapshot();
  });

  it('should render the component as no editable with dark theme.', () => {
    minimal.isInverted = true;
    minimal.assertion.isEditable = false;
    const assertion = TestRenderer.create(<Assertion {...minimal} />);
    expect(assertion).toMatchSnapshot();
  });

  it('should render the component with validation errors and error traffic light dot', () => {
    minimal.assertion.name = '';
    minimal.assertion.assertionString = '';

    minimal.validationErrors = {
      name: 'Must provide the Assertion name.',
      expression: 'Enter a valid condition statement.',
    };
    const assertion = TestRenderer.create(<Assertion {...minimal} />);
    expect(assertion).toMatchSnapshot();
  });
});
