import React from 'react';
import type { DynamicallyAddedParameterProps } from '..';
import { DynamicallyAddedParameter } from '..';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

describe('ui/dynamicallyaddedparameter', () => {
  let minimal: DynamicallyAddedParameterProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      schemaKey: 'text',
      icon: 'TEXT',
      title: 'title',
      description: '',
      titlePlaceholder: 'Enter some text',
      descriptionPlaceholder: 'Description of the text',
      renderDescriptionField: true,
      onTitleChange: (_schemaKey: string, _newValue: string | undefined) => {},
      onDescriptionChange: (_schemaKey: string, _newValue: string | undefined) => {},
      onDelete: (_schemaKey: string) => {},
      onRenderValueField: (schemaKey: string) => <div>{schemaKey}</div>,
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<DynamicallyAddedParameter {...minimal} />);
    const output = renderer.getRenderOutput();
    expect(output).toBeDefined();
  });

  it('should not render output if renderDescriptionField is undefined', () => {
    const minimalWithRenderDescriptionUndefined = { ...minimal, renderDescriptionField: undefined };
    renderer.render(<DynamicallyAddedParameter {...minimalWithRenderDescriptionUndefined} />);
    const output = renderer.getRenderOutput();
    const [renderDynamicParameter] = output.props.children;
    expect(renderDynamicParameter.props.children.filter((child: React.ReactElement) => child !== undefined).length).toBe(1);
  });

  it('should not render output if renderDescriptionField is false', () => {
    const minimalWithRenderDescriptionUndefined = { ...minimal, renderDescriptionField: false };
    renderer.render(<DynamicallyAddedParameter {...minimalWithRenderDescriptionUndefined} />);
    const output = renderer.getRenderOutput();
    const [renderDynamicParameter] = output.props.children;
    expect(renderDynamicParameter.props.children.filter((child: React.ReactElement) => child).length).toBe(1);
  });

  it('should render description field if renderDescriptionField is true', () => {
    const minimalWithRenderDescriptionTrue = { ...minimal, renderDescriptionField: true };
    renderer.render(<DynamicallyAddedParameter {...minimalWithRenderDescriptionTrue} />);
    const output = renderer.getRenderOutput();
    const [renderDynamicParameter] = output.props.children;
    expect(React.Children.toArray(renderDynamicParameter.props.children.filter((child: React.ReactElement) => child)).length).toBe(2);
  });

  it('should display passed in title in text box if title is in props', () => {
    const { getByPlaceholderText } = render(<DynamicallyAddedParameter {...minimal} />);
    const titleTextBox = getByPlaceholderText(minimal.titlePlaceholder!) as HTMLInputElement;
    expect(titleTextBox.value).toBe(minimal.title);
  });

  it('should display passed in description in text box if description is in props', () => {
    const minimalWithRenderDescriptionUndefined = { ...minimal, renderDescriptionField: true };
    const { getByPlaceholderText } = render(<DynamicallyAddedParameter {...minimalWithRenderDescriptionUndefined} />);
    const descriptionTextBox = getByPlaceholderText(minimal.descriptionPlaceholder!) as HTMLInputElement;
    expect(descriptionTextBox.value).toBe(minimal.description);
  });

  it('should pass expected values to onTitleChange callback when title is changed', async () => {
    const onTitleChange = vi.fn();
    const { getByPlaceholderText } = render(<DynamicallyAddedParameter {...minimal} onTitleChange={onTitleChange} />);
    const newText = 'New text';
    fireEvent.change(getByPlaceholderText(minimal.titlePlaceholder!), { target: { value: newText } });
    expect(onTitleChange).not.toHaveBeenCalled();
    fireEvent.blur(getByPlaceholderText(minimal.titlePlaceholder!));
    expect(onTitleChange).toHaveBeenCalledWith(minimal.schemaKey, newText);
  });

  it('should pass expected values to onDescriptionChange callback when description is changed', async () => {
    const onDescriptionChange = vi.fn();
    const minimalWithRenderDescriptionTrueAndOnDescriptionChangeMocked = { ...minimal, renderDescriptionField: true, onDescriptionChange };
    const { getByPlaceholderText } = render(
      <DynamicallyAddedParameter {...minimalWithRenderDescriptionTrueAndOnDescriptionChangeMocked} />
    );
    const newText = 'New text';
    fireEvent.change(getByPlaceholderText(minimal.descriptionPlaceholder!), { target: { value: newText } });
    expect(onDescriptionChange).not.toHaveBeenCalled();
    fireEvent.blur(getByPlaceholderText(minimal.descriptionPlaceholder!));
    expect(onDescriptionChange).toHaveBeenCalledWith(minimal.schemaKey, newText);
  });
});
