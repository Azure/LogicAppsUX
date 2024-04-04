import type { WorkflowparameterFieldProps } from '../workflowparametersField';
import { WorkflowparameterField } from '../workflowparametersField';
import { initializeIcons } from '@fluentui/react';
import * as React from 'react';
import { useIntl } from 'react-intl';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('ui/workflowparameters/workflowparameterField', () => {
  let minimal: WorkflowparameterFieldProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      isEditable: true,
      name: 'test',
      definition: { id: 'id', value: 'blue', name: 'test', type: 'String' },
      setName: vi.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    renderer.render(<WorkflowparameterField {...minimal} />);
    const parameterFields = renderer.getRenderOutput();
    expect(parameterFields).toBeDefined();
  });

  it('should render all fields when passed a parameter definition.', () => {
    const intl = useIntl();
    renderer.render(<WorkflowparameterField {...minimal} />);
    const parameterFields = renderer.getRenderOutput();
    expect(parameterFields.props.children).toHaveLength(3);

    const [name, type, defaultValue]: any[] = React.Children.toArray(parameterFields.props.children);
    const textFieldClassName = 'msla-workflow-parameter-field';

    const nameTitle = intl.formatMessage({
      defaultMessage: 'Name',
      id: 'm8Q61y',
      description: 'Parameter Field Name Title',
    });
    const nameDescription = intl.formatMessage({
      defaultMessage: 'Enter parameter name.',
      id: 'GreYWQ',
      description: 'Parameter Field Name Description',
    });
    expect(name.props.className).toBe(textFieldClassName);
    expect(name.props.children).toHaveLength(2);

    const [label, textField1]: any[] = React.Children.toArray(name.props.children);
    expect(label.props.children).toBe(nameTitle);
    expect(label.props.htmlFor).toBe('id-name');

    expect(textField1.props.id).toBe('id-name');
    expect(textField1.props.ariaLabel).toBe(nameTitle);
    expect(textField1.props.placeholder).toBe(nameDescription);
    expect(textField1.props.value).toBe(minimal.name);

    const typeTitle = intl.formatMessage({
      defaultMessage: 'Type',
      id: 'tNoZx2',
      description: 'Parameter Field Type Title',
    });
    expect(type.props.className).toBe(textFieldClassName);
    expect(type.props.children).toHaveLength(2);

    const [label2, dropdown]: any[] = React.Children.toArray(type.props.children);
    expect(label2.props.children).toBe(typeTitle);
    expect(label2.props.htmlFor).toBe('id-type');

    expect(dropdown.props.id).toBe('id-type');
    expect(dropdown.props.ariaLabel).toBe(typeTitle);
    expect(dropdown.props.options).toHaveLength(6);
    expect(dropdown.props.selectedKey).toBe('String');

    const defaultValueTitle = intl.formatMessage({
      defaultMessage: 'Value',
      id: 'mOxbN1',
      description: 'Parameter Field Default Value Title',
    });
    const defaultValueDescription = intl.formatMessage({
      defaultMessage: 'Enter value for parameter.',
      id: '7jAQar',
      description: 'Parameter Field Default Value Placeholder Text',
    });
    expect(defaultValue.props.className).toBe(textFieldClassName);
    expect(name.props.children).toHaveLength(2);

    const [label3, textField2]: any[] = React.Children.toArray(defaultValue.props.children);
    expect(label3.props.children).toBe(defaultValueTitle);
    expect(label3.props.htmlFor).toBe('id-value');

    expect(textField2.props.id).toBe('id-value');
    expect(textField2.props.ariaLabel).toBe(defaultValueTitle);
    expect(textField2.props.placeholder).toBe(defaultValueDescription);
    expect(textField2.props.value).toBe(minimal.definition.value);
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
