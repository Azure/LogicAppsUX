import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { WorkflowParameters, WorkflowParametersProps } from '../workflowparameters';
import { initializeIcons } from '@fluentui/react';
import { useIntl } from 'react-intl';

describe('ui/workflowparameters/workflowparameters', () => {
  let minimal: WorkflowParametersProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      parameters: [
        {
          id: 'test1',
          defaultValue: 'true',
          type: 'Bool',
          name: 'test',
          isEditable: true,
        },
        {
          id: 'test2',
          defaultValue: '{}',
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
      description: 'Create Title',
    });
    expect(header.props.className).toBe('msla-workflow-parameters-create');
    const headerText = header.props.children;
    expect(headerText.props.defaultMessage[0].value).toBe(headerTitle);

    expect(messageBar).toBeDefined();

    const addMessage = intl.formatMessage({
      defaultMessage: 'Create parameter',
      description: 'Create Parameter Text',
    });
    expect(add.props.className).toBe('msla-workflow-parameters-add');
    const addButton = add.props.children;
    expect(addButton.props.text).toBe(addMessage);
    expect(addButton.props.className).toBe('msla-workflow-parameters-create-button');

    expect(parameterList.props.items).toHaveLength(2);
  });
});
