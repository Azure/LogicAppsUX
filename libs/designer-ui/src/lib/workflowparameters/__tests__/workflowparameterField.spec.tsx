import type { WorkflowparameterFieldProps } from '../workflowparametersField';
import { WorkflowparameterField } from '../workflowparametersField';
import { initializeIcons } from '@fluentui/react';
import * as React from 'react';
import { useIntl } from 'react-intl';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
describe('ui/workflowparameters/workflowparameterField', () => {
  let minimal: WorkflowparameterFieldProps;
  let minimalWithDes: WorkflowparameterFieldProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      isEditable: true,
      name: 'test',
      definition: { id: 'id', value: 'blue', name: 'test', type: 'String' },
      setName: vi.fn(),
    };
    minimalWithDes = {
      ...minimal,
      definition: {
        ...minimal.definition,
        description: 'test des',
      },
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
    expect(parameterFields.props.children).toHaveLength(4);

    expect(parameterFields.props.children?.[2]).toBe(undefined); //undefined for empty description
    const [name, type, defaultValue]: any[] = React.Children.toArray(parameterFields.props.children);
    const textFieldClassName = 'msla-workflow-parameter-field';

    const nameTitle = intl.formatMessage({
      defaultMessage: 'Name',
      id: '9bc43ad7244f',
      description: 'Parameter Field Name Title',
    });
    const nameDescription = intl.formatMessage({
      defaultMessage: 'Enter parameter name.',
      id: '1ab798590139',
      description: 'Parameter Field Name Description',
    });
    expect(name.props.className).toBe(textFieldClassName);
    expect(name.props.children).toHaveLength(2);

    const [label, textField1]: any[] = React.Children.toArray(name.props.children);
    expect(label.props.text).toBe(nameTitle);
    expect(label.props.htmlFor).toBe('id-name');

    expect(textField1.props.id).toBe('id-name');
    expect(textField1.props.ariaLabel).toBe(nameTitle);
    expect(textField1.props.placeholder).toBe(nameDescription);
    expect(textField1.props.value).toBe(minimal.name);

    const typeTitle = intl.formatMessage({
      defaultMessage: 'Type',
      id: 'b4da19c76885',
      description: 'Parameter Field Type Title',
    });
    expect(type.props.className).toBe(textFieldClassName);
    expect(type.props.children).toHaveLength(2);

    const [label3, dropdown]: any[] = React.Children.toArray(type.props.children);
    expect(label3.props.text).toBe(typeTitle);
    expect(label3.props.htmlFor).toBe('id-type');

    expect(dropdown.props.id).toBe('id-type');
    expect(dropdown.props.ariaLabel).toBe(typeTitle);
    expect(dropdown.props.options).toHaveLength(6);
    expect(dropdown.props.selectedKey).toBe('String');

    const defaultValueTitle = intl.formatMessage({
      defaultMessage: 'Value',
      id: '98ec5b375ba2',
      description: 'Parameter Field Default Value Title',
    });
    const defaultValueDescription = intl.formatMessage({
      defaultMessage: 'Enter value for parameter.',
      id: 'ee30106ab117',
      description: 'Parameter Field Default Value Placeholder Text',
    });
    expect(defaultValue.props.className).toBe(textFieldClassName);
    expect(name.props.children).toHaveLength(2);

    const [label4, textField3]: any[] = React.Children.toArray(defaultValue.props.children);
    expect(label4.props.text).toBe(defaultValueTitle);
    expect(label4.props.htmlFor).toBe('id-value');

    expect(textField3.props.id).toBe('id-value');
    expect(textField3.props.ariaLabel).toBe(defaultValueTitle);
    expect(textField3.props.placeholder).toBe(defaultValueDescription);
    expect(textField3.props.value).toBe(minimal.definition.value);
  });

  it('should render all fields when passed a parameter definition with a description.', () => {
    const intl = useIntl();
    renderer.render(<WorkflowparameterField {...minimalWithDes} />);
    const parameterFields = renderer.getRenderOutput();
    expect(parameterFields.props.children).toHaveLength(4);

    const [name, type, description, defaultValue]: any[] = React.Children.toArray(parameterFields.props.children);
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
    expect(label.props.text).toBe(nameTitle);
    expect(label.props.htmlFor).toBe('id-name');

    expect(textField1.props.id).toBe('id-name');
    expect(textField1.props.ariaLabel).toBe(nameTitle);
    expect(textField1.props.placeholder).toBe(nameDescription);
    expect(textField1.props.value).toBe(minimalWithDes.name);

    const typeTitle = intl.formatMessage({
      defaultMessage: 'Type',
      id: 'tNoZx2',
      description: 'Parameter Field Type Title',
    });
    expect(type.props.className).toBe(textFieldClassName);
    expect(type.props.children).toHaveLength(2);

    const descriptionTitle = intl.formatMessage({
      defaultMessage: 'Description',
      id: '5170ce8b0a12',
      description: 'Parameter Field Description Title',
    });
    const [label2, textField2]: any[] = React.Children.toArray(description.props.children);
    expect(description.props.className).toBe(textFieldClassName);
    expect(label2.props.text).toBe(descriptionTitle);
    expect(label2.props.htmlFor).toBe('id-description');
    expect(textField2.props.children).toBe(minimalWithDes.definition.description);

    const [label3, dropdown]: any[] = React.Children.toArray(type.props.children);
    expect(label3.props.text).toBe(typeTitle);
    expect(label3.props.htmlFor).toBe('id-type');

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

    const [label4, textField3]: any[] = React.Children.toArray(defaultValue.props.children);
    expect(label4.props.text).toBe(defaultValueTitle);
    expect(label4.props.htmlFor).toBe('id-value');

    expect(textField3.props.id).toBe('id-value');
    expect(textField3.props.ariaLabel).toBe(defaultValueTitle);
    expect(textField3.props.placeholder).toBe(defaultValueDescription);
    expect(textField3.props.value).toBe(minimal.definition.value);
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
