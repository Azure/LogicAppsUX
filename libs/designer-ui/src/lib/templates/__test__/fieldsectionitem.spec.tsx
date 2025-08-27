import { FieldSectionItem } from '../fieldsectionitem';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import type { TemplatesSectionItem } from '../templatesSectionModel';

describe('ui/templates/fieldsectionitem', () => {
  const classNames = {
    sectionItem: 'msla-templates-section-item',
    sectionItemLabel: 'msla-templates-section-item-label',
    sectionItemValue: 'msla-templates-section-item-value',
    sectionItemText: 'msla-templates-section-item-text',
    sectionItemDivider: 'msla-templates-section-item-divider',
  };

  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    const textItem: TemplatesSectionItem = {
      type: 'text',
      value: 'test value',
    };

    renderer.render(<FieldSectionItem item={textItem} />);

    const component = renderer.getRenderOutput();
    expect(component).toBeDefined();
  });

  it('should render text item with correct structure', () => {
    const textItem: TemplatesSectionItem = {
      type: 'text',
      value: 'test value',
      label: 'Test Label',
    };

    renderer.render(<FieldSectionItem item={textItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(textItem);

    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
    const innerComponent = valueComponent.props.children;
    expect(innerComponent.type.name).toBe('SectionItemInner');
    expect(innerComponent.props.item).toBe(textItem);
  });

  it('should render text item without label', () => {
    const textItem: TemplatesSectionItem = {
      type: 'text',
      value: 'test value',
    };

    renderer.render(<FieldSectionItem item={textItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(textItem);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render divider item', () => {
    const dividerItem: TemplatesSectionItem = {
      type: 'divider',
      value: undefined,
    };

    renderer.render(<FieldSectionItem item={dividerItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render switch item', () => {
    const onChangeMock = vi.fn();
    const switchItem: TemplatesSectionItem = {
      type: 'switch',
      value: true,
      onChange: onChangeMock,
      label: 'Switch Label',
    };

    renderer.render(<FieldSectionItem item={switchItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(switchItem);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render textfield item', () => {
    const onChangeMock = vi.fn();
    const textfieldItem: TemplatesSectionItem = {
      type: 'textfield',
      value: 'input value',
      onChange: onChangeMock,
      label: 'Input Label',
      id: 'test-input',
    };

    renderer.render(<FieldSectionItem item={textfieldItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(textfieldItem);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render textarea item', () => {
    const onChangeMock = vi.fn();
    const textareaItem: TemplatesSectionItem = {
      type: 'textarea',
      value: 'textarea value',
      onChange: onChangeMock,
      label: 'Textarea Label',
      id: 'test-textarea',
    };

    renderer.render(<FieldSectionItem item={textareaItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(textareaItem);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render dropdown item', () => {
    const onOptionSelectMock = vi.fn();
    const dropdownItem: TemplatesSectionItem = {
      type: 'dropdown',
      value: 'option1',
      onOptionSelect: onOptionSelectMock,
      selectedOptions: ['option1'],
      options: [
        { id: '1', label: 'Option 1', value: 'option1' },
        { id: '2', label: 'Option 2', value: 'option2' },
      ],
      label: 'Dropdown Label',
      id: 'test-dropdown',
    };

    renderer.render(<FieldSectionItem item={dropdownItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(dropdownItem);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render radiogroup item', () => {
    const onOptionSelectMock = vi.fn();
    const radiogroupItem: TemplatesSectionItem = {
      type: 'radiogroup',
      value: 'option1',
      onOptionSelect: onOptionSelectMock,
      options: [
        { id: '1', label: 'Option 1', value: 'option1' },
        { id: '2', label: 'Option 2', value: 'option2' },
      ],
      label: 'Radio Group Label',
      id: 'test-radiogroup',
    };

    renderer.render(<FieldSectionItem item={radiogroupItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(radiogroupItem);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render custom item', () => {
    const onRenderItemMock = vi.fn().mockReturnValue(<div>Custom Component</div>);
    const customItem: TemplatesSectionItem = {
      type: 'custom',
      value: 'custom value',
      onRenderItem: onRenderItemMock,
      label: 'Custom Label',
      id: 'test-custom',
    };

    renderer.render(<FieldSectionItem item={customItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(customItem);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render item with required field', () => {
    const onChangeMock = vi.fn();
    const requiredItem: TemplatesSectionItem = {
      type: 'textfield',
      value: 'input value',
      onChange: onChangeMock,
      label: 'Required Field',
      id: 'test-required',
      required: true,
    };

    renderer.render(<FieldSectionItem item={requiredItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(requiredItem);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render item with error message', () => {
    const onChangeMock = vi.fn();
    const errorItem: TemplatesSectionItem = {
      type: 'textfield',
      value: '',
      onChange: onChangeMock,
      label: 'Error Field',
      id: 'test-error',
      required: true,
      errorMessage: 'This field is required',
    };

    renderer.render(<FieldSectionItem item={errorItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(errorItem);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render item with disabled state', () => {
    const onChangeMock = vi.fn();
    const disabledItem: TemplatesSectionItem = {
      type: 'textfield',
      value: 'disabled value',
      onChange: onChangeMock,
      label: 'Disabled Field',
      id: 'test-disabled',
      disabled: true,
    };

    renderer.render(<FieldSectionItem item={disabledItem} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(disabledItem);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render item with non-string label', () => {
    const customLabel = <span>Custom Label Component</span>;
    const itemWithCustomLabel: TemplatesSectionItem = {
      type: 'text',
      value: 'test value',
      label: customLabel,
    };

    renderer.render(<FieldSectionItem item={itemWithCustomLabel} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(itemWithCustomLabel);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });

  it('should render item with description', () => {
    const onChangeMock = vi.fn();
    const itemWithDescription: TemplatesSectionItem = {
      type: 'textfield',
      value: 'input value',
      onChange: onChangeMock,
      label: 'Field with Description',
      description: 'This is a helpful description',
      id: 'test-description',
    };

    renderer.render(<FieldSectionItem item={itemWithDescription} />);

    const component = renderer.getRenderOutput();
    expect(component.props.className).toBe(classNames.sectionItem);

    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
    expect(labelComponent.type.name).toBe('SectionLabel');
    expect(labelComponent.props.item).toBe(itemWithDescription);
    expect(valueComponent.props.className).toBe(classNames.sectionItemValue);
  });
});
