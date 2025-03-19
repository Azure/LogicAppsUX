import { Dropdown, Field, Input, Label, Link, Option, Radio, RadioGroup, type Slot, Text } from '@fluentui/react-components';
import { Open16Regular } from '@fluentui/react-icons';

interface BaseTemplatesSectionItem {
  type: 'text' | 'textField' | 'dropdown' | 'radioGroup';
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
  type: 'textField';
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
  type: 'radioGroup';
  onOptionSelect: (selectedValue: string) => void;
  options: {
    id: string;
    label: Slot<typeof Label>;
    value: string;
  }[];
}

export type TemplatesSectionItem = TextItem | TextFieldItem | DropdownItem | RadioGroupItem;

export interface BaseTemplatesSectionProps {
  title: string;
  isTitleRequired?: boolean;
  titleHtmlFor?: string;
  description?: string;
  descriptionLink?: {
    text: string;
    href: string;
  };
}

export interface ContentBasedProps extends BaseTemplatesSectionProps {
  items: TemplatesSectionItem[];
  children?: never;
}

export interface ChildrenBasedProps extends BaseTemplatesSectionProps {
  children: React.ReactNode;
  items?: never;
}

export type TemplatesSectionProps = ContentBasedProps | ChildrenBasedProps;

export const TemplatesSection = ({
  title,
  isTitleRequired,
  titleHtmlFor,
  description,
  descriptionLink,
  items,
  children = null,
}: TemplatesSectionProps) => {
  const onRenderItem = (item: TemplatesSectionItem) => {
    if (item.type === 'text') {
      return <Text className="msla-templates-section-item-text">{item.value}</Text>;
    }

    return (
      <Field validationMessage={item.errorMessage} hint={item.hint} required={item.required}>
        <CustomFieldInput {...item} />
      </Field>
    );
  };

  return (
    <div className="msla-templates-section">
      <Label className="msla-templates-section-title" required={isTitleRequired} htmlFor={titleHtmlFor}>
        {title}
      </Label>
      <Text className="msla-templates-section-description">
        {description}
        {descriptionLink && (
          <Link className="msla-templates-section-description-link" href={descriptionLink.href} target="_blank" rel="noreferrer">
            {descriptionLink.text}
            <Open16Regular className="msla-templates-section-description-icon" />
          </Link>
        )}
      </Text>

      <div className="msla-templates-section-items">
        {items
          ? items.map((item, index) => {
              return (
                <div key={index} className="msla-templates-section-item">
                  {item.label ? (
                    typeof item.label === 'string' ? (
                      <Text className="msla-templates-section-item-label">{item.label}</Text>
                    ) : (
                      <div className="msla-templates-section-item-label">{item.label}</div>
                    )
                  ) : null}
                  <div className="msla-templates-section-item-value">{onRenderItem(item)}</div>
                </div>
              );
            })
          : children}
      </div>
    </div>
  );
};

const CustomFieldInput = (item: TemplatesSectionItem) => {
  switch (item.type) {
    case 'textField':
      return (
        <Input
          data-testid={item.id}
          id={item.id}
          aria-label={typeof item.label === 'string' ? item.label : undefined}
          value={item.value}
          disabled={item.disabled}
          onChange={(_event, data) => item.onChange(data.value ?? '')}
          onBlur={item.onBlur}
        />
      );

    case 'dropdown':
      return (
        <Dropdown
          style={{ width: '100%' }}
          id={item.id}
          onOptionSelect={(e, option) => item.onOptionSelect(option?.selectedOptions)}
          disabled={item.disabled}
          value={item.value}
          selectedOptions={item.selectedOptions}
          size="small"
          placeholder={item.placeholder}
          onBlur={item.onBlur}
          multiselect={item.multiselect}
        >
          {item.options.map((option) => (
            <Option key={option.id} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Dropdown>
      );

    case 'radioGroup':
      return (
        <RadioGroup id={item.id} onChange={(_e, option) => item.onOptionSelect(option.value)} disabled={item.disabled} value={item.value}>
          {item.options.map((option) => (
            <Radio key={option.id} value={option.value} label={option.label} />
          ))}
        </RadioGroup>
      );

    default:
      return null;
  }
};
