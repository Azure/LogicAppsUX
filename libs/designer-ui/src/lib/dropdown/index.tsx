import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler } from '../editor/base';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react';
import { SelectableOptionMenuItemType, Dropdown } from '@fluentui/react';
import { guid } from '@microsoft-logic-apps/utils';
import type { FormEvent } from 'react';
import { useState } from 'react';

interface DropdownEditorProps {
  multiSelect?: boolean;
  initialValue: ValueSegment[];
  options: DropdownItem[];
  readonly?: boolean;
  height?: number;
  fontSize?: number;
  onChange?: ChangeHandler;
}

export interface DropdownItem {
  disabled?: boolean;
  key: string;
  value: any;
  displayName: string;
  type?: string;
}

export const DropdownEditor = ({
  multiSelect = false,
  initialValue,
  readonly,
  options,
  height,
  fontSize,
  onChange,
}: DropdownEditorProps): JSX.Element => {
  const [selectedKey, setSelectedKey] = useState<string | undefined>(multiSelect ? undefined : getSelectedKey(options, initialValue));
  const [selectedKeys, setSelectedKeys] = useState<string[] | undefined>(multiSelect ? getSelectedKeys(options, initialValue) : undefined);
  const [dropdownOptions] = useState<IDropdownOption[]>(getOptions(options));

  const dropdownStyles: Partial<IDropdownStyles> = {
    root: {
      minHeight: height ?? '30px',
      fontSize: fontSize ?? '14px',
    },
    dropdown: {
      minHeight: height ?? '30px',
    },
    title: {
      height: height ?? '30px',
      fontSize: fontSize ?? '14px',
      lineHeight: height ?? '30px',
    },
    caretDownWrapper: {
      paddingTop: '4px',
    },
  };

  const handleOptionSelect = (_event: FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      setSelectedKey(option.key as string);
      onChange?.({ value: [{ id: guid(), value: getSelectedValue(options, option.key as string), type: ValueSegmentType.LITERAL }] });
    }
  };

  const handleOptionMultiSelect = (_event: FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option && selectedKeys) {
      const newKeys = option.selected ? [...selectedKeys, option.key as string] : selectedKeys.filter((key: string) => key !== option.key);
      setSelectedKeys(newKeys);
      onChange?.({
        value: newKeys.map((key) => {
          return { id: guid(), value: getSelectedValue(options, key as string), type: ValueSegmentType.LITERAL };
        }),
      });
    }
  };

  return (
    <div className="msla-dropdown-editor-container">
      <Dropdown
        styles={dropdownStyles}
        disabled={readonly}
        options={dropdownOptions}
        multiSelect={multiSelect}
        selectedKey={selectedKey}
        selectedKeys={selectedKeys}
        onChange={multiSelect ? handleOptionMultiSelect : handleOptionSelect}
      />
    </div>
  );
};

const getOptions = (options: DropdownItem[]): IDropdownOption[] => {
  return [
    ...options.map((option: DropdownItem) => {
      const { key, displayName, disabled, type } = option;
      switch (key) {
        case 'divider':
          return { key: key, text: displayName, itemType: SelectableOptionMenuItemType.Divider, disabled: disabled, data: type };
        case 'header':
          return { key: key, text: displayName, itemType: SelectableOptionMenuItemType.Header, data: type, disabed: disabled };
        default:
          return { key: key, text: displayName, disabled: disabled, data: type };
      }
    }),
  ];
};

const getSelectedKey = (options: DropdownItem[], initialValue?: ValueSegment[]): string => {
  if (initialValue?.length === 1 && initialValue[0].type === ValueSegmentType.LITERAL) {
    return (
      options.find((option) => {
        return option.value === initialValue[0].value;
      })?.key ?? ''
    );
  }
  return '';
};

const getSelectedKeys = (options: DropdownItem[], initialValue?: ValueSegment[]): string[] => {
  const returnVal: string[] = [];
  initialValue?.forEach((segment) => {
    if (segment.type === ValueSegmentType.LITERAL) {
      returnVal.push(
        options.find((option) => {
          return option.value === segment.value;
        })?.key ?? ''
      );
    }
  });
  return returnVal;
};

const getSelectedValue = (options: DropdownItem[], key: string): any => {
  return options.find((option) => {
    return option.key === key;
  })?.value;
};
