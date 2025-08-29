import { FieldSectionItem } from '../fieldsectionitem';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import type { TemplatesSectionItem } from '../templatesSectionModel';

describe('ui/templates/FieldSectionItem', () => {
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
      value: 'Test text value',
      label: 'Test Label',
    };

    renderer.render(<FieldSectionItem item={textItem} />);

    const component = renderer.getRenderOutput();
    expect(component).toBeDefined();
    expect(component.type).toBe('div');
  });

  it('should have correct class structure', () => {
    const textItem: TemplatesSectionItem = {
      type: 'text',
      value: 'Test text value',
      label: 'Test Label',
    };

    renderer.render(<FieldSectionItem item={textItem} />);

    const component = renderer.getRenderOutput();
    const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);

    // Check that we have a label component and value wrapper
    expect(labelComponent).toBeDefined();
    expect(valueComponent).toBeDefined();
    expect(valueComponent.type).toBe('div');
  });

  describe('Text item', () => {
    it('should render text item with label', () => {
      const textItem: TemplatesSectionItem = {
        type: 'text',
        value: 'Test text value',
        label: 'Test Label',
      };

      renderer.render(<FieldSectionItem item={textItem} />);

      const component = renderer.getRenderOutput();
      const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      // Check that we have a SectionItemInner component inside
      expect(innerComponent.type.name).toBe('SectionItemInner');
      expect(innerComponent.props.item).toBe(textItem);
    });
  });

  describe('Switch item', () => {
    it('should render switch item', () => {
      const onChangeMock = vi.fn();
      const switchItem: TemplatesSectionItem = {
        type: 'switch',
        value: false,
        onChange: onChangeMock,
        label: 'Switch Label',
      };

      renderer.render(<FieldSectionItem item={switchItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.type.name).toBe('SectionItemInner');
      expect(innerComponent.props.item).toBe(switchItem);
    });

    it('should render checked switch', () => {
      const onChangeMock = vi.fn();
      const switchItem: TemplatesSectionItem = {
        type: 'switch',
        value: true,
        onChange: onChangeMock,
        label: 'Switch Label',
      };

      renderer.render(<FieldSectionItem item={switchItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.type.name).toBe('SectionItemInner');
      expect(innerComponent.props.item.value).toBe(true);
    });
  });

  describe('Divider item', () => {
    it('should render divider', () => {
      const dividerItem: TemplatesSectionItem = {
        type: 'divider',
        value: undefined,
      };

      renderer.render(<FieldSectionItem item={dividerItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.type.name).toBe('SectionItemInner');
      expect(innerComponent.props.item.type).toBe('divider');
    });
  });

  describe('Text field item', () => {
    it('should render text field with label', () => {
      const onChangeMock = vi.fn();
      const textFieldItem: TemplatesSectionItem = {
        type: 'textfield',
        value: 'initial value',
        onChange: onChangeMock,
        label: 'Text Field Label',
        id: 'test-textfield',
      };

      renderer.render(<FieldSectionItem item={textFieldItem} />);

      const component = renderer.getRenderOutput();
      const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      // Should have a SectionLabel component
      expect(labelComponent.type.name).toBe('SectionLabel');
      expect(labelComponent.props.item.label).toBe('Text Field Label');

      // Should have a SectionItemInner component
      expect(innerComponent.type.name).toBe('SectionItemInner');
      expect(innerComponent.props.item).toBe(textFieldItem);
    });

    it('should render disabled text field', () => {
      const onChangeMock = vi.fn();
      const textFieldItem: TemplatesSectionItem = {
        type: 'textfield',
        value: 'test value',
        onChange: onChangeMock,
        disabled: true,
        id: 'test-textfield',
      };

      renderer.render(<FieldSectionItem item={textFieldItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.type.name).toBe('SectionItemInner');
      expect(innerComponent.props.item.disabled).toBe(true);
    });

    it('should render required text field with error', () => {
      const onChangeMock = vi.fn();
      const textFieldItem: TemplatesSectionItem = {
        type: 'textfield',
        value: '',
        onChange: onChangeMock,
        label: 'Required Field',
        required: true,
        errorMessage: 'This field is required',
        id: 'test-required',
      };

      renderer.render(<FieldSectionItem item={textFieldItem} />);

      const component = renderer.getRenderOutput();
      const [labelComponent, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      // Label should receive the item with required property
      expect(labelComponent.props.item.required).toBe(true);

      // SectionItemInner should receive the item with error message
      expect(innerComponent.props.item.errorMessage).toBe('This field is required');
      expect(innerComponent.props.item.required).toBe(true);
    });
  });

  describe('Textarea item', () => {
    it('should render textarea with label', () => {
      const onChangeMock = vi.fn();
      const textAreaItem: TemplatesSectionItem = {
        type: 'textarea',
        value: 'initial textarea value',
        onChange: onChangeMock,
        label: 'Textarea Label',
        id: 'test-textarea',
      };

      renderer.render(<FieldSectionItem item={textAreaItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.type.name).toBe('SectionItemInner');
      expect(innerComponent.props.item.type).toBe('textarea');
      expect(innerComponent.props.item.value).toBe('initial textarea value');
      expect(innerComponent.props.item.id).toBe('test-textarea');
    });
  });

  describe('Dropdown item', () => {
    it('should render dropdown with options', () => {
      const onOptionSelectMock = vi.fn();
      const dropdownItem: TemplatesSectionItem = {
        type: 'dropdown',
        value: 'option1',
        onOptionSelect: onOptionSelectMock,
        selectedOptions: ['option1'],
        options: [
          { id: '1', label: 'Option 1', value: 'option1' },
          { id: '2', label: 'Option 2', value: 'option2' },
          { id: '3', label: 'Option 3', value: 'option3' },
        ],
        label: 'Dropdown Label',
        id: 'test-dropdown',
      };

      renderer.render(<FieldSectionItem item={dropdownItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.type.name).toBe('SectionItemInner');
      expect(innerComponent.props.item.type).toBe('dropdown');
      expect(innerComponent.props.item.value).toBe('option1');
      expect(innerComponent.props.item.options).toHaveLength(3);
      expect(innerComponent.props.item.selectedOptions).toEqual(['option1']);
    });

    it('should render multiselect dropdown', () => {
      const onOptionSelectMock = vi.fn();
      const dropdownItem: TemplatesSectionItem = {
        type: 'dropdown',
        value: ['option1', 'option2'],
        onOptionSelect: onOptionSelectMock,
        selectedOptions: ['option1', 'option2'],
        multiselect: true,
        options: [
          { id: '1', label: 'Option 1', value: 'option1' },
          { id: '2', label: 'Option 2', value: 'option2' },
        ],
        label: 'Multiselect Dropdown',
        id: 'test-multiselect',
      };

      renderer.render(<FieldSectionItem item={dropdownItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.props.item.multiselect).toBe(true);
      expect(innerComponent.props.item.value).toEqual(['option1', 'option2']);
    });
  });

  describe('Radio group item', () => {
    it('should render radio group with options', () => {
      const onOptionSelectMock = vi.fn();
      const radioGroupItem: TemplatesSectionItem = {
        type: 'radiogroup',
        value: 'option1',
        onOptionSelect: onOptionSelectMock,
        options: [
          { id: '1', label: 'Option 1', value: 'option1' },
          { id: '2', label: 'Option 2', value: 'option2' },
          { id: '3', label: 'Option 3', value: 'option3' },
        ],
        label: 'Radio Group Label',
        id: 'test-radiogroup',
      };

      renderer.render(<FieldSectionItem item={radioGroupItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.type.name).toBe('SectionItemInner');
      expect(innerComponent.props.item.type).toBe('radiogroup');
      expect(innerComponent.props.item.value).toBe('option1');
      expect(innerComponent.props.item.options).toHaveLength(3);
      expect(innerComponent.props.item.onOptionSelect).toBe(onOptionSelectMock);
    });
  });

  describe('Custom item', () => {
    it('should render custom component', () => {
      const customRenderMock = vi.fn().mockReturnValue(<div data-testid="custom-component">Custom Component Content</div>);
      const customItem: TemplatesSectionItem = {
        type: 'custom',
        value: undefined,
        onRenderItem: customRenderMock,
        label: 'Custom Label',
      };

      renderer.render(<FieldSectionItem item={customItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.type.name).toBe('SectionItemInner');
      expect(innerComponent.props.item.type).toBe('custom');
      expect(innerComponent.props.item.onRenderItem).toBe(customRenderMock);
    });
  });

  describe('Labels and descriptions', () => {
    it('should render InfoLabel when description is provided', () => {
      const textFieldItem: TemplatesSectionItem = {
        type: 'textfield',
        value: 'test value',
        onChange: vi.fn(),
        label: 'Field with Description',
        description: 'This is a helpful description',
        id: 'test-description',
      };

      renderer.render(<FieldSectionItem item={textFieldItem} />);

      const component = renderer.getRenderOutput();
      const [labelComponent]: any[] = React.Children.toArray(component.props.children);

      expect(labelComponent.type.name).toBe('SectionLabel');
      expect(labelComponent.props.item.description).toBe('This is a helpful description');
      expect(labelComponent.props.item.label).toBe('Field with Description');
    });

    it('should render regular Label when no description is provided', () => {
      const textFieldItem: TemplatesSectionItem = {
        type: 'textfield',
        value: 'test value',
        onChange: vi.fn(),
        label: 'Simple Field',
        id: 'test-simple',
      };

      renderer.render(<FieldSectionItem item={textFieldItem} />);

      const component = renderer.getRenderOutput();
      const [labelComponent]: any[] = React.Children.toArray(component.props.children);

      expect(labelComponent.type.name).toBe('SectionLabel');
      expect(labelComponent.props.item.label).toBe('Simple Field');
      expect(labelComponent.props.item.description).toBeUndefined();
    });
  });

  describe('Field properties', () => {
    it('should handle hint text', () => {
      const textFieldItem: TemplatesSectionItem = {
        type: 'textfield',
        value: 'test value',
        onChange: vi.fn(),
        label: 'Field with Hint',
        hint: 'Enter your information here',
        id: 'test-hint',
      };

      renderer.render(<FieldSectionItem item={textFieldItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.props.item.hint).toBe('Enter your information here');
    });

    it('should handle placeholder text', () => {
      const dropdownItem: TemplatesSectionItem = {
        type: 'dropdown',
        value: '',
        onOptionSelect: vi.fn(),
        selectedOptions: [],
        placeholder: 'Select an option...',
        options: [{ id: '1', label: 'Option 1', value: 'option1' }],
        id: 'test-dropdown-placeholder',
      };

      renderer.render(<FieldSectionItem item={dropdownItem} />);

      const component = renderer.getRenderOutput();
      const [, valueComponent]: any[] = React.Children.toArray(component.props.children);
      const innerComponent = valueComponent.props.children;

      expect(innerComponent.props.item.placeholder).toBe('Select an option...');
    });
  });
});
