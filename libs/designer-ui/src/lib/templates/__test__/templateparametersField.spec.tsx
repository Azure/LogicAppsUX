import type { TemplateparameterFieldProps } from '..';
import { TemplateparameterField } from '..';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

describe('ui/templates/templateparametersField', () => {
  let minimal: TemplateparameterFieldProps;
  let minimalWithDefault: TemplateparameterFieldProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      definition: {
        name: 'param 1',
        type: 'string',
        description: 'description for the parameter 1',
      },
      validationError: undefined,
    };
    minimalWithDefault = {
      definition: {
        name: 'param 2',
        type: 'string',
        value: 'Value for the parameter 2',
        description: 'description for the parameter 2',
      },
      validationError: 'validation error happened',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<TemplateparameterField {...minimal} />);

    const callout = renderer.getRenderOutput();
    expect(callout).toBeDefined();
  });

  it('should render all fields including value field with no value', () => {
    renderer.render(<TemplateparameterField {...minimal} />);
    const callout = renderer.getRenderOutput();
    const innerCount = React.Children.count(callout.props.children);
    expect(innerCount).toBe(4);

    const [name, type, description, value]: any[] = React.Children.toArray(callout.props.children);
    expect(name.props.className).toBe('msla-workflow-parameter-field');
    expect(type.props.className).toBe('msla-workflow-parameter-field');
    expect(description.props.className).toBe('msla-workflow-parameter-field');
    expect(value.props.className).toBe('msla-workflow-parameter-field');

    const nameInnerCount = React.Children.count(name.props.children);
    expect(nameInnerCount).toBe(2);
    const [nameTitle, nameField]: any[] = React.Children.toArray(name.props.children);
    expect(nameTitle.props.children).toBe('Name');
    expect(nameField.props.children).toBe(minimal.definition.name);

    const typeInnerCount = React.Children.count(type.props.children);
    expect(typeInnerCount).toBe(2);
    const [typeTitle, typeField]: any[] = React.Children.toArray(type.props.children);
    expect(typeTitle.props.children).toBe('Type');
    expect(typeField.props.children).toBe(minimal.definition.type);

    const descriptionInnerCount = React.Children.count(description.props.children);
    expect(descriptionInnerCount).toBe(2);
    const [descriptionTitle, descriptionField]: any[] = React.Children.toArray(description.props.children);
    expect(descriptionTitle.props.children).toBe('Description');
    expect(descriptionField.props.children).toBe(minimal.definition.description);

    const valueInnerCount = React.Children.count(value.props.children);
    expect(valueInnerCount).toBe(2);
    const [valueTitle, valueField]: any[] = React.Children.toArray(value.props.children);
    expect(valueTitle.props.children).toBe('Value');
    expect(valueField.props.ariaLabel).toBe('Value');
    expect(valueField.props.placeholder).toBe('Enter value for parameter.');
    expect(valueField.props.value).toBe(undefined);
  });

  it('should render fields with value and validatio error when those exist', () => {
    renderer.render(<TemplateparameterField {...minimalWithDefault} />);
    const callout = renderer.getRenderOutput();
    const innerCount = React.Children.count(callout.props.children);
    expect(innerCount).toBe(4);

    const [name, type, description, value]: any[] = React.Children.toArray(callout.props.children);
    expect(name.props.className).toBe('msla-workflow-parameter-field');
    expect(type.props.className).toBe('msla-workflow-parameter-field');
    expect(description.props.className).toBe('msla-workflow-parameter-field');
    expect(value.props.className).toBe('msla-workflow-parameter-field');

    const nameInnerCount = React.Children.count(name.props.children);
    expect(nameInnerCount).toBe(2);
    const [nameTitle, nameField]: any[] = React.Children.toArray(name.props.children);
    expect(nameTitle.props.children).toBe('Name');
    expect(nameField.props.children).toBe(minimalWithDefault.definition.name);

    const typeInnerCount = React.Children.count(type.props.children);
    expect(typeInnerCount).toBe(2);
    const [typeTitle, typeField]: any[] = React.Children.toArray(type.props.children);
    expect(typeTitle.props.children).toBe('Type');
    expect(typeField.props.children).toBe(minimalWithDefault.definition.type);

    const descriptionInnerCount = React.Children.count(description.props.children);
    expect(descriptionInnerCount).toBe(2);
    const [descriptionTitle, descriptionField]: any[] = React.Children.toArray(description.props.children);
    expect(descriptionTitle.props.children).toBe('Description');
    expect(descriptionField.props.children).toBe(minimalWithDefault.definition.description);

    const valueInnerCount = React.Children.count(value.props.children);
    expect(valueInnerCount).toBe(2);
    const [valueTitle, valueField]: any[] = React.Children.toArray(value.props.children);
    expect(valueTitle.props.children).toBe('Value');
    expect(valueField.props.ariaLabel).toBe('Value');
    expect(valueField.props.placeholder).toBe('Enter value for parameter.');
    expect(valueField.props.value).toBe(minimalWithDefault.definition.value);
    expect(valueField.props.errorMessage).toBe(minimalWithDefault.validationError);
  });
});
