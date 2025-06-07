import {
  Divider,
  Dropdown,
  Field,
  InfoLabel,
  Input,
  Label,
  Link,
  Option,
  Radio,
  RadioGroup,
  Switch,
  Text,
  Textarea,
} from '@fluentui/react-components';
import { Open16Regular } from '@fluentui/react-icons';
import type { BaseFieldItem, TemplatesSectionItem, TemplatesSectionProps } from './templatesSectionModel';
import { css } from '@fluentui/utilities';

export const TemplatesSection = ({
  title,
  isTitleRequired,
  titleHtmlFor,
  description,
  descriptionLink,
  items,
  cssOverrides = {},
  children = null,
}: TemplatesSectionProps) => {
  const onRenderItem = (item: TemplatesSectionItem) => {
    if (item.type === 'divider') {
      return <Divider className="msla-templates-section-item-divider" />;
    }

    if (item.type === 'text') {
      return <Text className="msla-templates-section-item-text">{item.value}</Text>;
    }

    if (item.type === 'switch') {
      return <Switch checked={item.value} onChange={(ev) => item.onChange(ev.currentTarget.checked)} />;
    }

    return (
      <Field
        validationMessage={item.errorMessage}
        validationState={item.required && item.errorMessage ? 'error' : undefined}
        hint={item.hint}
        required={item.required}
      >
        <CustomFieldInput {...item} />
      </Field>
    );
  };

  const onRenderLabel = (item: TemplatesSectionItem) => {
    if (!item.label) {
      return null;
    }

    if (typeof item.label !== 'string') {
      return <div className="msla-templates-section-item-label">{item.label}</div>;
    }

    return item.description ? (
      <InfoLabel
        info={item.description}
        className="msla-templates-section-item-label"
        required={(item as BaseFieldItem)?.required ?? false}
      >
        {item.label}
      </InfoLabel>
    ) : (
      <Label className="msla-templates-section-item-label" required={(item as BaseFieldItem)?.required ?? false}>
        {item.label}
      </Label>
    );
  };

  return (
    <div className="msla-templates-section">
      {title ? (
        <Label className="msla-templates-section-title" required={isTitleRequired} htmlFor={titleHtmlFor}>
          {title}
        </Label>
      ) : null}
      {description ? (
        <Text className="msla-templates-section-description">
          {description}
          {descriptionLink && (
            <Link className="msla-templates-section-description-link" href={descriptionLink.href} target="_blank" rel="noreferrer">
              {descriptionLink.text}
              <Open16Regular className="msla-templates-section-description-icon" />
            </Link>
          )}
        </Text>
      ) : null}

      <div className={css('msla-templates-section-items', cssOverrides?.['sectionItems'])}>
        {items
          ? items.map((item, index) => {
              return (
                <div key={index} className="msla-templates-section-item">
                  {onRenderLabel(item)}
                  <div className="msla-templates-section-item-value">{onRenderItem(item)}</div>
                </div>
              );
            })
          : children}
      </div>
    </div>
  );
};

const CustomFieldInput = (item: TemplatesSectionItem): JSX.Element | null => {
  switch (item.type) {
    case 'textfield':
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

    case 'textarea':
      return (
        <Textarea
          data-testid={item.id}
          id={item.id}
          aria-label={typeof item.label === 'string' ? item.label : undefined}
          resize="vertical"
          value={item.value}
          disabled={item.disabled}
          onChange={(_event, data) => item.onChange(data.value ?? '')}
        />
      );

    case 'dropdown':
      return (
        <Dropdown
          style={{ width: '100%' }}
          id={item.id}
          onOptionSelect={(e, option) => item.onOptionSelect(option?.selectedOptions)}
          disabled={item.disabled}
          defaultValue={item.value}
          defaultSelectedOptions={item.selectedOptions}
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

    case 'radiogroup':
      return (
        <RadioGroup id={item.id} onChange={(_e, option) => item.onOptionSelect(option.value)} disabled={item.disabled} value={item.value}>
          {item.options.map((option) => (
            <Radio key={option.id} value={option.value} label={option.label} />
          ))}
        </RadioGroup>
      );

    case 'custom':
      return item.onRenderItem(item) as JSX.Element;

    default:
      return null;
  }
};
