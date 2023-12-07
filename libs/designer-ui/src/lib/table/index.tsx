import type { DictionaryEditorItemProps, DictionaryEditorProps } from '../dictionary';
import { DictionaryEditor, DictionaryType } from '../dictionary';
import { ValueSegmentType } from '../editor';
import type { ChangeState } from '../editor/base';
import type { IDropdownOption, IDropdownStyles } from '@fluentui/react';
import { Dropdown } from '@fluentui/react';
import { getIntl } from '@microsoft/intl-logic-apps';
import { guid } from '@microsoft/utils-logic-apps';
import type { FormEvent } from 'react';
import { useState } from 'react';

export interface TableEditorProps extends DictionaryEditorProps {
  columnMode: ColumnMode;
  labelId: string;
  columns?: number;
  titles?: string[];
  keys?: string[];
  types?: string[];
}

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

export const ColumnMode = {
  Automatic: 'Automatic',
  Custom: 'Custom',
} as const;
export type ColumnMode = (typeof ColumnMode)[keyof typeof ColumnMode];

export const TableEditor: React.FC<TableEditorProps> = ({
  initialItems,
  initialValue,
  columnMode,
  titles,
  types,
  readonly,
  labelId,
  placeholder,
  tokenPickerButtonProps,
  dataAutomationId,
  onChange,
  getTokenPicker,
  tokenMapping,
  loadParameterValueFromString,
}): JSX.Element => {
  const intl = getIntl();
  const columnOptions = [
    {
      key: ColumnMode.Automatic,
      text: intl.formatMessage({ defaultMessage: 'Automatic', description: 'Option text for table column type in table editor' }),
    },
    {
      key: ColumnMode.Custom,
      text: intl.formatMessage({ defaultMessage: 'Custom', description: 'Option text for table column type in table editor' }),
    },
  ];
  const emptyValue = [{ id: guid(), type: ValueSegmentType.LITERAL, value: '' }];
  const [selectedKey, setSelectedKey] = useState<ColumnMode>(columnMode);
  const [items] = useState<DictionaryEditorItemProps[]>(initialItems ?? []);
  const onOptionChange = (_event: FormEvent<HTMLDivElement>, option?: IDropdownOption): void => {
    if (option) {
      setSelectedKey(option.key as ColumnMode);
      onChange?.({ value: emptyValue, viewModel: { items, columnMode: option.key } });
    }
  };

  const onItemsChange = (newState: ChangeState) =>
    onChange?.({
      value: newState.value,
      viewModel: { items: newState.viewModel.items, columnMode: ColumnMode.Custom },
    });
  return (
    <div>
      <Dropdown styles={dropdownStyles} disabled={readonly} options={columnOptions} selectedKey={selectedKey} onChange={onOptionChange} />
      {selectedKey === ColumnMode.Custom ? (
        <div className="msla-table-editor-container" data-automation-id={dataAutomationId}>
          <DictionaryEditor
            labelId={labelId}
            keyTitle={titles?.[0]}
            valueTitle={titles?.[1]}
            keyType={types?.[0]}
            valueType={types?.[1]}
            dictionaryType={DictionaryType.TABLE}
            placeholder={placeholder}
            readonly={readonly}
            initialValue={initialValue}
            initialItems={items}
            tokenPickerButtonProps={tokenPickerButtonProps}
            getTokenPicker={getTokenPicker}
            tokenMapping={tokenMapping}
            loadParameterValueFromString={loadParameterValueFromString}
            onChange={onItemsChange}
          />
        </div>
      ) : null}
    </div>
  );
};
