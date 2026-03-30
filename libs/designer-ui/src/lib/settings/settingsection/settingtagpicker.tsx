import type { SettingProps } from './';
import { Combobox, Option, Tag, TagGroup, makeStyles, tokens } from '@fluentui/react-components';
import type { ComboboxProps, OptionOnSelectData, SelectionEvents } from '@fluentui/react-components';
import { Dismiss12Regular } from '@fluentui/react-icons';
import { useState, useCallback } from 'react';

export interface TagPickerOption {
  label: string;
  value: string;
}

export interface SettingTagPickerProps extends SettingProps {
  options: TagPickerOption[];
  selectedValues: string[];
  onSelectionChange?: (selectedValues: string[]) => void;
  placeholder?: string;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  combobox: {
    width: '100%',
    minWidth: '200px',
  },
  tagGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    marginTop: tokens.spacingVerticalXS,
  },
  tag: {
    backgroundColor: tokens.colorNeutralBackground3,
  },
});

export const SettingTagPicker = ({
  readOnly,
  options,
  selectedValues,
  onSelectionChange,
  customLabel,
  ariaLabel,
  placeholder = 'Select options...',
}: SettingTagPickerProps): JSX.Element => {
  const styles = useStyles();
  const [inputValue, setInputValue] = useState('');

  const handleOptionSelect: ComboboxProps['onOptionSelect'] = useCallback(
    (_event: SelectionEvents, data: OptionOnSelectData) => {
      if (data.optionValue && !selectedValues.includes(data.optionValue)) {
        onSelectionChange?.([...selectedValues, data.optionValue]);
      }
      setInputValue('');
    },
    [selectedValues, onSelectionChange]
  );

  const handleTagDismiss = useCallback(
    (value: string) => {
      onSelectionChange?.(selectedValues.filter((v) => v !== value));
    },
    [selectedValues, onSelectionChange]
  );

  const availableOptions = options.filter((opt) => !selectedValues.includes(opt.value));
  const filteredOptions = inputValue
    ? availableOptions.filter((opt) => opt.label.toLowerCase().includes(inputValue.toLowerCase()))
    : availableOptions;

  return (
    <div className={styles.root}>
      {customLabel}
      <Combobox
        className={styles.combobox}
        aria-label={ariaLabel}
        disabled={readOnly}
        placeholder={placeholder}
        value={inputValue}
        onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
        onOptionSelect={handleOptionSelect}
        positioning="below"
        freeform
      >
        {filteredOptions.map((option) => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Combobox>
      {selectedValues.length > 0 && (
        <TagGroup className={styles.tagGroup} aria-label="Selected values">
          {selectedValues.map((value) => {
            const option = options.find((opt) => opt.value === value);
            return (
              <Tag
                key={value}
                className={styles.tag}
                dismissible={!readOnly}
                dismissIcon={<Dismiss12Regular />}
                value={value}
                onClick={() => !readOnly && handleTagDismiss(value)}
              >
                {option?.label ?? value}
              </Tag>
            );
          })}
        </TagGroup>
      )}
    </div>
  );
};
