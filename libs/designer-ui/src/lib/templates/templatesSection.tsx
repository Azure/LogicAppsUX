import { Field, Input, Label, Text } from '@fluentui/react-components';

interface BaseTemplatesSectionItem {
  label: string;
  value: string; // Required when type is 'text'
}

interface TextItem extends BaseTemplatesSectionItem {
  type: 'text';
  onChange?: never; // Prevents onChange for text type
  disabled?: never; // Prevents disabled for text type
}

interface InputItem extends BaseTemplatesSectionItem {
  type: 'input';
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  hint?: string;
}

export type TemplatesSectionItem = TextItem | InputItem;

export interface BaseTemplatesSectionProps {
  title: string;
  description?: string;
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

export const TemplatesSection = ({ title, description, items, children = null }: TemplatesSectionProps) => {
  const onRenderItem = (item: TemplatesSectionItem) => {
    switch (item.type) {
      case 'text':
        return <Text className="msla-templates-tab-review-section-details-value">{item.value}</Text>;
      case 'input':
        return (
          <Field validationMessage={item.error} hint={item.hint} required={item.required}>
            <Input
              className="msla-templates-parameters-values"
              data-testid={`msla-templates-parameter-value-${item.label}`}
              id={`msla-templates-parameter-value-${item.label}`}
              aria-label={item.label}
              value={item.value}
              disabled={item.disabled}
              onChange={(_event, data) => item.onChange(data.value ?? '')}
            />
          </Field>
        );
      default:
        return null;
    }
  };

  return (
    <div className="msla-templates-section">
      <Label className="msla-templates-tab-label" required={true} htmlFor={'workflowNameLabel'}>
        {title}
      </Label>
      <Text className="msla-templates-tab-label-description">{description}</Text>

      {items
        ? items.map((item, index) => {
            return (
              <div key={index} className="msla-templates-tab-review-section-details">
                <Text className="msla-templates-tab-review-section-details-title">{item.label}</Text>
                {onRenderItem(item)}
              </div>
            );
          })
        : children}
      {children}
    </div>
  );
};
