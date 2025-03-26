// biome-ignore lint/correctness/noUnusedImports: actually is used
import React from 'react';
import { ConditionExpression, type ConditionExpressionProps } from '../index';
import { initializeIcons } from '@fluentui/react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('ui/unitTesting/conditionExpression/index', () => {
  let minimal: ConditionExpressionProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      editorId: 'condition-expression-editor-id',
      labelId: 'condition-expression-label-id',
      initialValue: '@equals(1, 1)',
      filteredTokenGroup: [],
      tokenGroup: [],
      expressionGroup: [],
      getValueSegmentFromToken: vi.fn(),
      isReadOnly: false,
      onChange: vi.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render without assertions items and add button.', () => {
    const conditionExpression = renderer.render(<ConditionExpression {...minimal} />);
    expect(conditionExpression).toMatchSnapshot();
  });
});
