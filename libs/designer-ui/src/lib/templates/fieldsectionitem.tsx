import {
  Divider,
  Dropdown,
  Field,
  InfoLabel,
  Input,
  Label,
  Option,
  Radio,
  RadioGroup,
  Switch,
  Text,
  Textarea,
} from '@fluentui/react-components';
import type { BaseFieldItem, TemplatesSectionItem } from './templatesSectionModel';
import { useTemplatesStyles } from './styles';

interface FieldSectionItemProps {
  item: TemplatesSectionItem;
}

export const FieldSectionItem = ({ item }: FieldSectionItemProps) => {
  const styles = useTemplatesStyles();

  return (
    <div className={styles.fieldSectionItem}>
      <SectionLabel item={item} />
      <div className={styles.fieldSectionItemValue}>
        <SectionItemInner item={item} />
      </div>
    </div>
  );
};

const SectionLabel = ({ item }: { item: TemplatesSectionItem }) => {
  const styles = useTemplatesStyles();

  if (!item.label) {
    return null;
  }

  if (typeof item.label !== 'string') {
    return <div className={styles.fieldSectionItemLabel}>{item.label}</div>;
  }

  return item.description ? (
    <InfoLabel info={item.description} className={styles.fieldSectionItemLabel} required={(item as BaseFieldItem)?.required ?? false}>
      {item.label}
    </InfoLabel>
  ) : (
    <Label className={styles.fieldSectionItemLabel} required={(item as BaseFieldItem)?.required ?? false}>
      {item.label}
    </Label>
  );
};

const SectionItemInner = ({ item }: { item: TemplatesSectionItem }) => {
  if (item.type === 'divider') {
    return <Divider />;
  }

  if (item.type === 'text') {
    return <Text>{item.value}</Text>;
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
          placeholder={item.placeholder}
          onChange={(_event, data) => item.onChange(data.value ?? '')}
          onBlur={item.onBlur}
          contentAfter={item.contentAfter}
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
