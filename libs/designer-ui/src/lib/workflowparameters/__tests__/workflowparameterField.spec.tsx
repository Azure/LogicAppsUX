import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import * as TestUtils from 'react-dom/test-utils';
import { WorkflowparameterField, WorkflowparameterFieldProps } from '../workflowparametersField';
import { initializeIcons } from '@fluentui/react';
import { useIntl } from 'react-intl';

describe('ui/workflowparameters/workflowparameter', () => {
  let minimal: WorkflowparameterFieldProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      isEditable: true,
      name: 'test',
      definition: { id: 'id', defaultValue: 'blue', name: 'test', type: 'Array', value: 'testing' },
      setName: jest.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const parameter = TestUtils.renderIntoDocument<WorkflowparameterFieldProps>(<WorkflowparameterField {...minimal} />);
    expect(parameter).toBeDefined();
  });

  it('should render all fields when passed a parameter definition.', () => {
    const intl = useIntl();
    renderer.render(<WorkflowparameterField {...minimal} />);
    const parameterFields = renderer.getRenderOutput();

    const [name, type, defaultValue, actualValue]: any[] = React.Children.toArray(parameterFields.props.children);
    const textFieldClassName = 'msla-workflow-parameter-field';

    const nameTitle = intl.formatMessage({
      defaultMessage: 'Name',
      description: 'Parameter Field Name Title',
    });
    expect(name.props.className).toBe(textFieldClassName);
    const [label, textField1]: any[] = React.Children.toArray(name.props.children);
    expect(label.props.children).toBe(nameTitle);
    expect(textField1.props.id).toBe('id-name');
    expect(textField1.props.ariaLabel).toBe(nameTitle);

    const typeTitle = intl.formatMessage({
      defaultMessage: 'Type',
      description: 'Parameter Field Type Title',
    });
    expect(type.props.className).toBe(textFieldClassName);
    const [label2, dropdown]: any[] = React.Children.toArray(type.props.children);
    expect(label2.props.children).toBe(typeTitle);
    expect(dropdown.props.ariaLabel).toBe(typeTitle);
    expect(dropdown.props.selectedKey).toBe('Array');

    const defaultValueTitle = intl.formatMessage({
      defaultMessage: 'Default Value',
      description: 'Parameter Field Default Value Title',
    });
    expect(defaultValue.props.className).toBe(textFieldClassName);
    const [, textField2]: any[] = React.Children.toArray(defaultValue.props.children);
    expect(textField2.props.id).toBe('id-defaultValue');
    expect(textField2.props.ariaLabel).toBe(defaultValueTitle);

    const actualValueTitle = intl.formatMessage({
      defaultMessage: 'Actual Value',
      description: 'Parameter Field Actual Value Title',
    });
    expect(actualValue.props.className).toBe(textFieldClassName);
    const [, textField3]: any[] = React.Children.toArray(actualValue.props.children);
    expect(textField3.props.id).toBe('id-value');
    expect(textField3.props.ariaLabel).toBe(actualValueTitle);
    expect(textField3.props.disabled).toBeTruthy();
  });

  // TODO: 12798972 render correct type value when case does not match serialized type

  it('should render nothing when type passed is invalid.', () => {
    const props = { ...minimal, definition: { ...minimal.definition, type: 'random' } };
    renderer.render(<WorkflowparameterField {...props} />);
    const parameterFields = renderer.getRenderOutput();
    const [, type]: any[] = React.Children.toArray(parameterFields.props.children);
    expect(type.props.selectedKey).toBeUndefined();
  });

  // TODO: 12798972 render error messages when validation errors have been passed for the properties
});
