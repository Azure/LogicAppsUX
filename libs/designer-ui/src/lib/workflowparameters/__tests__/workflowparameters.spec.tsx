import type { WorkflowParametersProps } from '../workflowparameters';
import { WorkflowParameters } from '../workflowparameters';
import { initializeIcons } from '@fluentui/react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
describe('ui/workflowparameters/workflowparameters', () => {
  let minimal: WorkflowParametersProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      parameters: [
        {
          id: 'test1',
          value: 'true',
          type: 'Bool',
          name: 'test',
          isEditable: true,
        },
        {
          id: 'test2',
          value: '{}',
          type: 'Object',
          name: 'test2',
          isEditable: false,
        },
      ],
    };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const parameters = renderer.render(<WorkflowParameters {...minimal} />);
    expect(parameters).toMatchSnapshot();
  });

  it('should render parameters when provided.', () => {
    renderer.render(<WorkflowParameters {...minimal} />);
    const parameters = renderer.getRenderOutput();

    // Basic structure check - verify the component renders with parameters
    expect(parameters).toBeDefined();
    expect(parameters.props.children).toBeDefined();
  });
});
