import type { WorkflowParameterProps } from '../workflowparameter';
import { WorkflowParameter } from '../workflowparameter';
import { initializeIcons } from '@fluentui/react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
describe('ui/workflowparameters/workflowparameter', () => {
  let minimal: WorkflowParameterProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = { definition: { id: 'id', name: '', type: 'Array' } };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const parameter = renderer.render(<WorkflowParameter {...minimal} />);
    expect(parameter).toMatchSnapshot();
  });

  it('should render workflow parameter when passed a parameter definition.', () => {
    renderer.render(<WorkflowParameter {...minimal} />);
    const parameter = renderer.getRenderOutput();

    // Basic structure check - just verify the component renders
    expect(parameter).toBeDefined();
    expect(parameter.props.children).toBeDefined();
  });
});
