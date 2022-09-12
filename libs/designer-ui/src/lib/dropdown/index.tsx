import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { BaseEditorProps } from '../editor/base';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react';
import { SelectableOptionMenuItemType, Dropdown } from '@fluentui/react';
import type { FormEvent } from 'react';
import { useState } from 'react';

const dropdownStyles: Partial<IDropdownStyles> = {
  root: {
    minHeight: '30px',
    fontSize: '14px',
  },
  dropdown: {
    minHeight: '30px',
  },
  title: {
    height: '30px',
    fontSize: '14px',
    lineHeight: '30px',
  },
  caretDownWrapper: {
    paddingTop: '4px',
  },
};

interface DropdownEditorProps extends BaseEditorProps {
  multiSelect?: boolean;
  options: DropdownItem[];
}

export interface DropdownItem {
  disabled?: boolean;
  key: string;
  value: any;
  displayName: string;
  type?: string;
}

export const DropdownEditor = ({ multiSelect = false, initialValue, readonly, options }: DropdownEditorProps): JSX.Element => {
  const [selectedKey, setSelectedKey] = useState<string>(getSelectedKey(options, initialValue));
  const [selectedKeys, setSelectedKeys] = useState<string[]>(getSelectedKeys(options, initialValue));
  const [dropdownOptions] = useState<IDropdownOption[]>(getOptions(options));

  const handleOptionSelect = (_event: FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      setSelectedKey(option.key as string);
    }
  };

  const handleOptionMultiSelect = (_event: FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      setSelectedKeys(option.selected ? [...selectedKeys, option.key as string] : selectedKeys.filter((key: string) => key !== option.key));
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
