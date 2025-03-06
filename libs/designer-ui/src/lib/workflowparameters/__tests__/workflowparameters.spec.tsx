import type { WorkflowParametersProps } from '../workflowparameters';
import { WorkflowParameters } from '../workflowparameters';
import { initializeIcons } from '@fluentui/react';
import * as React from 'react';
import { useIntl } from 'react-intl';
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
    const intl = useIntl();
    renderer.render(<WorkflowParameters {...minimal} />);
    const parameters = renderer.getRenderOutput();
    const [header, messageBar, add, parameterList]: any[] = React.Children.toArray(parameters.props.children);

    const headerTitle = intl.formatMessage({
      defaultMessage: 'Parameters',
      id: 'a515097dfd95',
      description: 'Create Title',
    });
    expect(header.props.className).toBe('msla-workflow-parameters-heading');
    const [headerTextSection]: any[] = React.Children.toArray(header.props.children);
    const headerText = headerTextSection.props.text;
    expect(headerText).toBe(headerTitle);

    expect(messageBar).toBeDefined();

    const addMessage = intl.formatMessage({
      defaultMessage: 'Create parameter',
      id: 'bf01ff5d5ee6',
      description: 'Create Parameter Text',
    });
    expect(add.props.className).toBe('msla-workflow-parameters-add');
    const addButton = add.props.children;
    expect(addButton.props.children).toBe(addMessage);

    expect(parameterList.props.items).toHaveLength(2);
  });
});
