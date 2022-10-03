import type { RowItemProps } from '.';
import { Checkbox } from '../checkbox';
import { notEqual } from '../dictionary/plugins/SerializeExpandedDictionary';
import type { ValueSegment } from '../editor';
import type { ChangeState } from '../editor/base';
import type { ButtonOffSet } from '../editor/base/plugins/TokenPickerButton';
import { StringEditor } from '../editor/string';
import { RowDropdown } from './RowDropdown';
import type { ICalloutProps, IIconProps, IOverflowSetItemProps, IOverflowSetStyles } from '@fluentui/react';
import { IconButton, DirectionalHint, TooltipHost, OverflowSet } from '@fluentui/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

const overflowStyle: Partial<IOverflowSetStyles> = {
  root: {
    height: '100%',
    backgroundColor: 'transparent',
  },
};

const menuIconProps: IIconProps = {
  iconName: 'More',
};

interface RowProps {
  checked?: boolean;
  rowMenuItems: IOverflowSetItemProps[];
  keyValue?: ValueSegment[];
  valueValue?: ValueSegment[];
  dropdownValue?: string;
  index: number;
  containerOffset: number;
  handleUpdateParent: (newProps: RowItemProps, index: number) => void;
  GetTokenPicker: (
    editorId: string,
    labelId: string,
    onClick?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void
  ) => JSX.Element;
}

export const Row = ({
  checked = false,
  rowMenuItems,
  keyValue = [],
  valueValue = [],
  dropdownValue,
  index,
  containerOffset,
  handleUpdateParent,
  GetTokenPicker,
}: RowProps) => {
  const intl = useIntl();
  const keyEditorRef = useRef<HTMLDivElement | null>(null);
  const valueEditorRef = useRef<HTMLDivElement | null>(null);
  const [key, setKey] = useState<ValueSegment[]>(keyValue);
  const [pickerOffset, setPickerOffset] = useState<ButtonOffSet>();

  const updatePickerHeight = useCallback(() => {
    let itemHeight = 0;
    if (keyEditorRef.current && valueEditorRef.current) {
      const keyHeight = keyEditorRef.current.getBoundingClientRect().top;
      const valueHeight = valueEditorRef.current.getBoundingClientRect().top;
      itemHeight += Math.min(keyHeight, valueHeight);
    }
    setPickerOffset({ heightOffset: containerOffset - itemHeight });
  }, [containerOffset]);

  useEffect(() => {
    updatePickerHeight();
  }, [containerOffset, updatePickerHeight]);

  const handleKeyChange = (newState: ChangeState) => {
    if (notEqual(keyValue, newState.value)) {
      setKey(newState.value);
      handleUpdateParent({ type: 'row', checked: checked, key: newState.value, dropdownVal: dropdownValue, value: valueValue }, index);
    }
    if (newState.value.length === 0) {
      setKey([]);
    }
  };

  const handleSelectedOption = (newState: ChangeState) => {
    handleUpdateParent({ type: 'row', checked: checked, key: keyValue, dropdownVal: newState.value[0].value, value: valueValue }, index);
  };

  const handleValueChange = (newState: ChangeState) => {
    if (notEqual(valueValue, newState.value)) {
      handleUpdateParent({ type: 'row', checked: checked, key: keyValue, dropdownVal: dropdownValue, value: newState.value }, index);
    }
  };

  const handleCheckbox = () => {
    handleUpdateParent({ type: 'row', checked: !checked, key: keyValue, dropdownVal: dropdownValue, value: valueValue }, index);
  };

  const onRenderOverflowButton = (): JSX.Element => {
    const calloutProps: ICalloutProps = {
      directionalHint: DirectionalHint.leftCenter,
    };

    const rowCommands = intl.formatMessage({
      defaultMessage: 'More commands',
      description: 'Label for commands in row',
    });
    return (
      <TooltipHost calloutProps={calloutProps} content={rowCommands}>
        <IconButton
          ariaLabel={rowCommands}
          styles={overflowStyle}
          menuIconProps={menuIconProps}
          menuProps={rowMenuItems && { items: rowMenuItems }}
        />
      </TooltipHost>
    );
  };

  const rowValueInputPlaceholder = intl.formatMessage({
    defaultMessage: 'Choose a value',
    description: 'placeholder text for row values',
  });
  return (
    <div className="msla-querybuilder-row-container">
      <div className="msla-querybuilder-row-gutter-hook" />
      <Checkbox className="msla-querybuilder-row-checkbox" initialChecked={checked} onChange={handleCheckbox} />
      <div className="msla-querybuilder-row-content">
        <div ref={keyEditorRef}>
          <StringEditor
            className={'msla-querybuilder-row-value-input'}
            initialValue={keyValue}
            placeholder={rowValueInputPlaceholder}
            singleLine={true}
            onChange={handleKeyChange}
            GetTokenPicker={GetTokenPicker}
            tokenPickerButtonProps={{ buttonOffset: pickerOffset }}
          />
        </div>
        <RowDropdown disabled={key.length === 0} selectedOption={dropdownValue} onChange={handleSelectedOption} />
        <div ref={valueEditorRef}>
          <StringEditor
            className={'msla-querybuilder-row-value-input'}
            initialValue={valueValue}
            placeholder={rowValueInputPlaceholder}
            singleLine={true}
            GetTokenPicker={GetTokenPicker}
            onChange={handleValueChange}
            tokenPickerButtonProps={{ buttonOffset: pickerOffset }}
          />
        </div>
      </div>
      <OverflowSet
        className="msla-querybuilder-row-more"
        styles={overflowStyle}
        items={[]}
        overflowItems={rowMenuItems}
        onRenderOverflowButton={onRenderOverflowButton}
        onRenderItem={function (_item: IOverflowSetItemProps) {
          throw new Error('No items in overflowset');
        }}
      />
    </div>
  );
};
