import type { Label, Slot } from '@fluentui/react-components';

interface BaseTemplatesSectionItem {
  type: 'text' | 'textfield' | 'textarea' | 'dropdown' | 'radiogroup' | 'switch' | 'custom';
  label?: string | React.ReactNode;
  value: any | undefined;
}

interface TextItem extends BaseTemplatesSectionItem {
  type: 'text';
}

interface SwitchItem extends BaseTemplatesSectionItem {
  type: 'switch';
  value: boolean;
  onChange: (value: boolean) => void;
}

export interface BaseFieldItem extends BaseTemplatesSectionItem {
  id?: string;
  required?: boolean;
  disabled?: boolean;
  errorMessage?: string;
  hint?: string;
}

interface BaseTextInputFieldItem extends BaseFieldItem {
  placeholder?: string;
  onBlur?: () => Promise<void>;
}

interface TextFieldItem extends BaseTextInputFieldItem {
  type: 'textfield';
  onChange: (value: string) => void;
}

interface TextAreaItem extends BaseTextInputFieldItem {
  type: 'textarea';
  onChange: (value: string) => void;
}

interface DropdownItem extends BaseTextInputFieldItem {
  type: 'dropdown';
  options: {
    id: string;
    label: string;
    value: string;
  }[];
  onOptionSelect: (selectedOptions: string[]) => void;
  selectedOptions: string[];
  multiselect?: boolean;
}

interface RadioGroupItem extends BaseFieldItem {
  type: 'radiogroup';
  onOptionSelect: (selectedValue: string) => void;
  options: {
    id: string;
    label: Slot<typeof Label>;
    value: string;
  }[];
}

interface CustomFieldItem extends BaseFieldItem {
  type: 'custom';
  onRenderItem: (item: TemplatesSectionItem) => React.ReactNode;
}

export type TemplatesSectionItem = TextItem | TextFieldItem | TextAreaItem | DropdownItem | RadioGroupItem | SwitchItem | CustomFieldItem;

interface BaseTemplatesSectionProps {
  title?: string;
  isTitleRequired?: boolean;
  titleHtmlFor?: string;
  description?: string;
  descriptionLink?: {
    text: string;
    href: string;
  };
}

interface ContentBasedProps extends BaseTemplatesSectionProps {
  items: TemplatesSectionItem[];
  children?: never;
}

interface ChildrenBasedProps extends BaseTemplatesSectionProps {
  children: React.ReactNode;
  items?: never;
}

export type TemplatesSectionProps = ContentBasedProps | ChildrenBasedProps;
