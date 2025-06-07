import { equals } from '@microsoft/logic-apps-shared';
import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { createLiteralValueSegment } from '../editor/base/utils/helper';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react';
import { SelectableOptionMenuItemType, Dropdown } from '@fluentui/react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useDropdownStyles } from './styles';

interface SerializationOptions {
  valueType: string;
  separator?: string;
}

export interface DropdownEditorProps {
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
  // Event Handlers
  onChange?: ChangeHandler;
  customOnChangeHandler?: (event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => void;
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
  initialValue,
  options,
  placeholder,
  label,
  height,
  fontSize,
  multiSelect,
  readonly,
  isCaseSensitive,
  onChange,
  customOnChangeHandler,
  serialization,
  dataAutomationId,
}: DropdownEditorProps): JSX.Element => {
  const [selectedKey, setSelectedKey] = useState<string | undefined>(
    multiSelect ? undefined : getSelectedKey(options, initialValue, isCaseSensitive)
  );
  const [selectedKeys, setSelectedKeys] = useState<string[] | undefined>(
    multiSelect ? getSelectedKeys(options, initialValue, serialization) : undefined
  );
  const dropdownOptions = useMemo<IDropdownOption[]>(() => getOptions(options), [options]);
  const classes = useDropdownStyles();

  const dropdownStyles: Partial<IDropdownStyles> = {
    root: {
      minHeight: height ?? '30px',
      fontSize: fontSize ?? '15px',
    },
    dropdown: {
      minHeight: height ?? '30px',
    },
    title: {
      height: height ?? '30px',
      fontSize: fontSize ?? '15px',
      lineHeight: height ?? '30px',
    },
    caretDownWrapper: {
      paddingTop: '4px',
    },
  };

  const handleOptionSelect = (_event: FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      setSelectedKey(option.key as string);
      onChange?.({ value: [createLiteralValueSegment(getSelectedValue(options, option.key as string))] });
    }
  };

  const handleOptionMultiSelect = (_event: FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option && selectedKeys) {
      const newKeys = option.selected ? [...selectedKeys, option.key as string] : selectedKeys.filter((key: string) => key !== option.key);
      setSelectedKeys(newKeys);

      const selectedValues = newKeys.map((key) => getSelectedValue(options, key));
      onChange?.({
        value: [
          createLiteralValueSegment(
            serialization?.valueType === 'array' ? JSON.stringify(selectedValues) : selectedValues.join(serialization?.separator)
          ),
        ],
      });
    }
  };

  return (
    <div className={classes.container} data-automation-id={dataAutomationId}>
      <Dropdown
        ariaLabel={label}
        styles={dropdownStyles}
        disabled={readonly}
        options={dropdownOptions}
        multiSelect={multiSelect}
        multiSelectDelimiter={serialization?.separator}
        selectedKey={selectedKey}
        selectedKeys={selectedKeys}
        placeholder={placeholder}
        onChange={(event: React.FormEvent<HTMLDivElement>, option?: IDropdownOption) => {
          customOnChangeHandler?.(event, option);
          multiSelect ? handleOptionMultiSelect(event, option) : handleOptionSelect(event, option);
        }}
      />
    </div>
  );
};

const getOptions = (options: DropdownItem[]): IDropdownOption[] => {
  return [
    ...options.map((option: DropdownItem) => {
      const { key, displayName, disabled, type, value } = option;
      switch (key) {
        case 'divider':
          return { key: key, text: displayName, itemType: SelectableOptionMenuItemType.Divider, disabled: disabled, data: type };
        case 'header':
          return { key: key, text: displayName, itemType: SelectableOptionMenuItemType.Header, data: type, disabed: disabled };
        default:
          return { key: key, text: displayName, disabled: disabled, data: type, value: value };
      }
    }),
  ];
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

const getSelectedKeys = (options: DropdownItem[], initialValue?: ValueSegment[], serialization?: SerializationOptions): string[] => {
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
        return option.value === selectedValue;
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
