import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { ReadOnlyParameters, ReadOnlyParametersProps } from '../workflowparametersReadOnly';

describe('ui/workflowparameters/workflowparameterReadOnly', () => {
  let minimal: ReadOnlyParametersProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      name: 'test',
      parameterDetails: {
        name: `test-name`,
        defaultValue: `test-defaultValue`,
        type: `test-type`,
        value: `test-value`,
      },
      type: 'Bool',
      defaultValue: 'true',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const ReadOnlyParameter = renderer.render(<ReadOnlyParameters {...minimal} />);

    expect(ReadOnlyParameter).toMatchSnapshot();
  });

  it('should render parameters when provided.', () => {
    renderer.render(<ReadOnlyParameters {...minimal} />);
    const parameters = renderer.getRenderOutput();

    const textFieldClassName = 'msla-workflow-parameter-field';
    const readOnlyClassName = 'msla-workflow-parameter-read-only';
    const [name, type, defaultValue]: any[] = React.Children.toArray(parameters.props.children);

    expect(name.props.className).toBe(textFieldClassName);
    const [, text1]: any[] = React.Children.toArray(name.props.children);
    expect(text1.props.className).toBe(readOnlyClassName);
    expect(text1.props.children).toBe(minimal.name);

    expect(type.props.className).toBe(textFieldClassName);
    const [, text2]: any[] = React.Children.toArray(type.props.children);
    expect(text2.props.className).toBe(readOnlyClassName);
    expect(text2.props.children).toBe(minimal.type);

    expect(defaultValue.props.className).toBe('msla-workflow-parameter-value-field');
    const [, text3]: any[] = React.Children.toArray(defaultValue.props.children);
    expect(text3.props.className).toBe(readOnlyClassName);
    expect(text3.props.children).toBe(minimal.defaultValue);
  });
});
