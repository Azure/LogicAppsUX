import { Field, Input, Label, Link, Text } from '@fluentui/react-components';
import { Open16Regular } from '@fluentui/react-icons';

interface BaseTemplatesSectionItem {
  label?: string;
  value: string | undefined;
}

interface TextItem extends BaseTemplatesSectionItem {
  type: 'text';
  onChange?: never;
  disabled?: never;
}

interface TextFieldItem extends BaseTemplatesSectionItem {
  type: 'textField';
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  errorMessage?: string;
  hint?: string;
  onBlur?: () => Promise<void>;
}

export type TemplatesSectionItem = TextItem | TextFieldItem;

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
    switch (item.type) {
      case 'text':
        return <Text className="msla-templates-section-item-text">{item.value}</Text>;
      case 'textField':
        return (
          <Field validationMessage={item.errorMessage} hint={item.hint} required={item.required}>
            <Input
              //   className="msla-templates-parameters-values"
              data-testid={item.id}
              id={item.id}
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
                  {item.label ? <Text className="msla-templates-section-item-label">{item.label}</Text> : null}
                  <div className="msla-templates-section-item-value">{onRenderItem(item)}</div>
                </div>
              );
            })
          : children}
      </div>
    </div>
  );
};
