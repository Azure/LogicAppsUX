import type { WorkflowParameterProps } from '../workflowparameter';
import { WorkflowParameter } from '../workflowparameter';
import { initializeIcons } from '@fluentui/react';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

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
    const parameter = renderer.render(<WorkflowParameter {...minimal} />);
    expect(parameter).toMatchSnapshot();
  });

  it('should render workflow parameter when passed a parameter definition.', () => {
    renderer.render(<WorkflowParameter {...minimal} />);
    const parameter = renderer.getRenderOutput();

    const [group, button]: any[] = React.Children.toArray(parameter.props.children);
    expect(button).toBeDefined();

    const [fieldsFragment]: any[] = React.Children.toArray(group.props.children);
    expect(fieldsFragment).toBeDefined();

    const [commandBar]: any[] = React.Children.toArray(fieldsFragment.props.children);
    expect(commandBar).toBeDefined();

    expect(commandBar.props.className).toBe('msla-workflow-parameter-heading-button');
    console.log('commandBar.props', commandBar.props);
    expect(commandBar.props.children).toBe('New parameter');
  });
});
