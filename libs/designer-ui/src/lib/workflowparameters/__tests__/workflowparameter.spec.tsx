import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import * as TestUtils from 'react-dom/test-utils';
import { WorkflowParameter, WorkflowParameterProps } from '../workflowparameter';
import { initializeIcons } from '@fluentui/react';
import { CommandButton } from '@fluentui/react';

describe('ui/workflowparameters/workflowparameter', () => {
  let minimal: WorkflowParameterProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = { definition: { id: 'id', name: '', type: 'Array' } };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const parameter = TestUtils.renderIntoDocument<WorkflowParameterProps>(<WorkflowParameter {...minimal} />);
    expect(parameter).toBeDefined();
  });

  it('should render all fields when passed a parameter definition.', () => {
    renderer.render(<WorkflowParameter {...minimal} />);
    const parameter = renderer.getRenderOutput();

    const [group, button]: any[] = React.Children.toArray(parameter.props.children);
    expect(group.props.className).toBe('msla-workflow-parameter-group');
    expect(button).toBeDefined();

    const [fieldsFragment]: any[] = React.Children.toArray(group.props.children);
    expect(fieldsFragment).toBeDefined();

    const [commandBar]: any[] = React.Children.toArray(fieldsFragment.props.children);
    expect(commandBar).toBeDefined();

    expect(commandBar.props.className).toBe('msla-workflow-parameter-heading-button');
    expect(commandBar.props.text).toBe('New parameter');
  });
});
