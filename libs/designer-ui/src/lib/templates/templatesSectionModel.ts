import type { Label, Slot } from '@fluentui/react-components';

interface BaseTemplatesSectionItem {
  type: 'text' | 'textfield' | 'dropdown' | 'radiogroup';
  label?: string | React.ReactNode;
  value: string | undefined;
}

interface TextItem extends BaseTemplatesSectionItem {
  type: 'text';
}

interface BaseFieldItem extends BaseTemplatesSectionItem {
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

export type TemplatesSectionItem = TextItem | TextFieldItem | DropdownItem | RadioGroupItem;

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
