import { equals } from '@microsoft/logic-apps-shared';
import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { createLiteralValueSegment } from '../editor/base/utils/helper';
import { Combobox, mergeClasses, Option } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { useDropdownStyles } from './styles';
import { useIntl } from 'react-intl';

interface SerializationOptions {
  valueType: string;
  separator?: string;
}

export interface DropdownEditorProps {
  className?: string;
  initialValue: ValueSegment[];
  options: DropdownItem[];
  // Appearance
  placeholder?: string;
  label?: string;
  height?: number;
  fontSize?: number;
  // Behavior
  multiSelect?: boolean;
  readonly?: boolean;
  isCaseSensitive?: boolean;
  flexibleWidth?: boolean; // Allow parent container to control width instead of forcing 100%
  // Event Handlers
  onChange?: ChangeHandler;
  customOnChangeHandler?: (optionValue: string, optionText: string) => void;
  virtualizeThreshold?: number; // Show virtualization when options exceed this number
  // Misc
  serialization?: SerializationOptions;
  dataAutomationId?: string;
}

export interface DropdownItem {
  disabled?: boolean;
  key: string;
  value: any;
  displayName: string;
  type?: string;
}

export const DropdownEditor = ({
  className,
  initialValue,
  options,
  placeholder,
  label,
  height,
  fontSize,
  multiSelect,
  readonly,
  isCaseSensitive,
  flexibleWidth = false,
  onChange,
  customOnChangeHandler,
  serialization,
  dataAutomationId,
  virtualizeThreshold = 100,
}: DropdownEditorProps): JSX.Element => {
  const intl = useIntl();
  const [selectedKey, setSelectedKey] = useState<string>(multiSelect ? '' : getSelectedKey(options, initialValue, isCaseSensitive));
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    multiSelect ? getSelectedKeys(options, initialValue, serialization, isCaseSensitive) : []
  );
  const [searchValue, setSearchValue] = useState<string>('');

  const filteredOptions = useMemo(() => {
    if (!searchValue) {
      return options;
    }
    const lowerSearch = searchValue.toLowerCase();
    return options.filter(
      (option) => option.displayName.toLowerCase().includes(lowerSearch) || String(option.value).toLowerCase().includes(lowerSearch)
    );
  }, [options, searchValue]);

  // Performance optimization: limit rendered options for very large lists
  const maxVisibleOptions = virtualizeThreshold;
  const displayedOptions = useMemo(() => {
    return filteredOptions.length > maxVisibleOptions ? filteredOptions.slice(0, maxVisibleOptions) : filteredOptions;
  }, [filteredOptions, maxVisibleOptions]);

  const hasMoreOptions = filteredOptions.length > displayedOptions.length;
  const classes = useDropdownStyles();

  const handleOptionSelect = (optionValue: string): void => {
    const option = options.find((opt) => opt.key === optionValue);
    if (option) {
      setSelectedKey(option.key);
      setSearchValue(''); // Clear search on selection
      onChange?.({ value: [createLiteralValueSegment(option.value)] });
      customOnChangeHandler?.(option.key, option.displayName);
    }
  };

  const handleMultiSelect = (optionValue: string): void => {
    const option = options.find((opt) => opt.key === optionValue);
    if (option) {
      const isSelected = selectedKeys.includes(option.key);
      const newKeys = isSelected ? selectedKeys.filter((key) => key !== option.key) : [...selectedKeys, option.key];

      setSelectedKeys(newKeys);
      setSearchValue(''); // Clear search on selection

      const selectedValues = newKeys.map((key) => getSelectedValue(options, key));
      onChange?.({
        value: [
          createLiteralValueSegment(
            serialization?.valueType === 'array' ? JSON.stringify(selectedValues) : selectedValues.join(serialization?.separator || ',')
          ),
        ],
      });
      customOnChangeHandler?.(option.key, option.displayName);
    }
  };

  const renderOptions = () => {
    return displayedOptions.map((option) => {
      if (option.key === 'divider') {
        return <hr key={option.key} className={classes.divider} />;
      }
      if (option.key === 'header') {
        return (
          <div key={option.key} className={classes.header}>
            {option.displayName}
          </div>
        );
      }

      return (
        <Option key={option.key} value={option.key} text={option.displayName} disabled={option.disabled}>
          {option.displayName}
        </Option>
      );
    });
  };

  const selectedValue = multiSelect
    ? selectedKeys
        .map((key) => options.find((opt) => opt.key === key)?.displayName)
        .filter(Boolean)
        .join(', ')
    : options.find((opt) => opt.key === selectedKey)?.displayName || '';

  const comboboxStyle = {
    height: height ? `${height}px` : '32px',
    fontSize: fontSize ? `${fontSize}px` : '14px',
    width: '100%',
  };

  const comboboxProps = {
    'aria-label': label,
    'aria-disabled': readonly ? true : undefined,
    disabled: readonly,
    placeholder:
      placeholder ??
      intl.formatMessage({
        defaultMessage: 'Select an option',
        id: 'WP8egw',
        description: 'Placeholder text for dropdown editor',
      }),
    value: searchValue || selectedValue,
    selectedOptions: multiSelect ? selectedKeys : selectedKey ? [selectedKey] : [],
    multiselect: multiSelect,
    onOptionSelect: (_event: any, data: any) => {
      if (data.optionValue) {
        multiSelect ? handleMultiSelect(data.optionValue) : handleOptionSelect(data.optionValue);
      }
    },
    onInput: (event: any) => {
      const value = (event.target as HTMLInputElement).value;
      setSearchValue(value);
    },
    style: comboboxStyle,
    'data-automation-id': dataAutomationId,
  };

  const INTL_TEXT = {
    noResults: intl.formatMessage({
      defaultMessage: 'No results found',
      id: '+R82zZ',
      description: 'Text displayed when no options match the search query',
    }),
    moreOptions: intl.formatMessage(
      {
        defaultMessage: 'Showing {displayedCount} of {totalCount} options. Type to search...',
        id: '2NGCQq',
        description: 'Text displayed when there are more options than can be shown at once',
      },
      {
        displayedCount: displayedOptions.length,
        totalCount: filteredOptions.length,
      }
    ),
  };

  const content = (
    <div className={mergeClasses(className, flexibleWidth ? classes.containerFlexible : classes.container)}>
      <Combobox {...comboboxProps}>
        {renderOptions()}
        {hasMoreOptions && <div className={classes.moreOptions}>{INTL_TEXT.moreOptions}</div>}
        {filteredOptions.length === 0 && searchValue && <div className={classes.noResults}>{INTL_TEXT.noResults}</div>}
      </Combobox>
    </div>
  );

  return content;
};

const getSelectedKey = (options: DropdownItem[], initialValue?: ValueSegment[], isCaseSensitive = false): string => {
  if (initialValue?.length === 1 && initialValue[0].type === ValueSegmentType.LITERAL) {
    return (
      options.find((option) => {
        return equals(String(option.value), initialValue[0].value, !isCaseSensitive);
      })?.key ?? ''
    );
  }
  return '';
};

const getSelectedKeys = (
  options: DropdownItem[],
  initialValue?: ValueSegment[],
  serialization?: SerializationOptions,
  isCaseSensitive = false
): string[] => {
  const returnVal: string[] = [];
  if (initialValue?.length === 1 && initialValue[0].type === ValueSegmentType.LITERAL) {
    const value = initialValue[0].value;
    const selectedValues =
      serialization?.valueType === 'array'
        ? Array.isArray(value)
          ? value
          : JSON.parse(value || '[]')
        : value.split(serialization?.separator || ',');

    for (const selectedValue of selectedValues) {
      const option = options.find((option) => {
        return equals(String(option.value), String(selectedValue), !isCaseSensitive);
      });

      if (option) {
        returnVal.push(option.key);
      }
    }
  }
  return returnVal;
};

const getSelectedValue = (options: DropdownItem[], key: string): any => {
  return options.find((option) => {
    return option.key === key;
  })?.value;
};
