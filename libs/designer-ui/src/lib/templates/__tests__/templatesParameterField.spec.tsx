import type { TemplatesParameterFieldProps } from '../templatesParametersField';
import { TemplatesParameterField } from '../templatesParametersField';
import { initializeIcons } from '@fluentui/react';
import * as React from 'react';
import { useIntl } from 'react-intl';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
describe('ui/templates/templatesParameterField', () => {
  let minimal: TemplatesParameterFieldProps;
  let minimalWithError: TemplatesParameterFieldProps;
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      definition: { value: 'blue', name: 'test1', type: 'String', description: 'description1', displayName: 'display name' },
      validationError: undefined,
    };
    minimalWithError = {
      ...minimal,
      validationError: 'validation failed',
    };
    renderer = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    renderer.render(<TemplatesParameterField {...minimal} />);
    const parameterFields = renderer.getRenderOutput();
    expect(parameterFields).toBeDefined();
  });

  it('should render all fields when passed a parameter definition.', () => {
    const intl = useIntl();
    renderer.render(<TemplatesParameterField {...minimal} />);
    const parameterFields = renderer.getRenderOutput();
    expect(parameterFields.props.children).toHaveLength(3);

    const [displayName, description, valueField]: any[] = React.Children.toArray(parameterFields.props.children);

    expect(displayName.props.className).toBe('msla-templates-parameter-heading');
    expect(displayName.props.children).toBeTruthy();
    const [label]: any[] = React.Children.toArray(displayName.props.children);
    expect(label.props.className).toBe('msla-templates-parameter-heading-text');
    expect(label.props.text).toBe(minimal.definition.displayName);

    expect(description.props.className).toBe('msla-templates-parameter-description');
    expect(description.props.children).toBeTruthy();

    const [text]: any[] = React.Children.toArray(description.props.children);
    expect(text.props.className).toBe('msla-templates-parameter-description-text');
    expect(text.props.children).toBe('description1');

    const defaultValueDescription = intl.formatMessage({
      defaultMessage: 'Enter value for parameter.',
      id: '7jAQar',
      description: 'Parameter Field Default Value Placeholder Text',
    });

    const valueLabelText = `Value (${minimal.definition.type})`;
    const valueLabelId = `${minimal.definition.name}-value`;

    expect(valueField.props.className).toBe('msla-templates-parameter-field');
    expect(valueField.props.children).toHaveLength(2);

    const [label2, textField]: any[] = React.Children.toArray(valueField.props.children);
    expect(label2.props.text).toBe(valueLabelText);
    expect(label2.props.htmlFor).toBe(valueLabelId);

    expect(textField.props.id).toBe(valueLabelId);
    expect(textField.props.ariaLabel).toBe(valueLabelText);
    expect(textField.props.placeholder).toBe(defaultValueDescription);
    expect(textField.props.value).toBe(minimal.definition.value);
  });
  it('should render the error message when there is a validation error', () => {
    renderer.render(<TemplatesParameterField {...minimalWithError} />);
    const parameterFields = renderer.getRenderOutput();
    expect(parameterFields.props.children).toHaveLength(3);

    const [_displayName, _description, valueField]: any[] = React.Children.toArray(parameterFields.props.children);
    const valueLabelText = `Value (${minimal.definition.type})`;
    const valueLabelId = `${minimal.definition.name}-value`;

    expect(valueField.props.className).toBe('msla-templates-parameter-field');
    expect(valueField.props.children).toHaveLength(2);

    const [label2, textField]: any[] = React.Children.toArray(valueField.props.children);
    expect(label2.props.text).toBe(valueLabelText);
    expect(label2.props.htmlFor).toBe(valueLabelId);

    expect(textField.props.id).toBe(valueLabelId);
    expect(textField.props.errorMessage).toBe(minimalWithError.validationError);
  });

  it('should render nothing when type passed is invalid.', () => {
    const props = { ...minimal, definition: { ...minimal.definition, type: 'random' } };
    renderer.render(<TemplatesParameterField {...props} />);
    const parameterFields = renderer.getRenderOutput();
    const [, type]: any[] = React.Children.toArray(parameterFields.props.children);
    expect(type.props.selectedKey).toBeUndefined();
  });
});
