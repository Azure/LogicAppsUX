import type { GroupedItems, GroupItemProps, RowItemProps } from '.';
import { Checkbox } from '../checkbox';
import { notEqual } from '../dictionary/plugins/SerializeExpandedDictionary';
import type { ValueSegment } from '../editor';
import type { ChangeState } from '../editor/base';
import type { ButtonOffSet } from '../editor/base/plugins/TokenPickerButton';
import { StringEditor } from '../editor/string';
import type { MoveOption } from './Group';
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
  keyValue?: ValueSegment[];
  valueValue?: ValueSegment[];
  dropdownValue?: string;
  index: number;
  containerOffset: number;
  showDisabledDelete?: boolean;
  isGroupable?: boolean;
  groupedItems: GroupedItems[];
  isTop: boolean;
  isBottom: boolean;
  handleMove?: (childIndex: number, moveOption: MoveOption) => void;
  handleDeleteChild?: (indexToDelete: number | number[]) => void;
  handleUpdateParent: (newProps: RowItemProps | GroupItemProps, index: number) => void;
  GetTokenPicker: (
    editorId: string,
    labelId: string,
    onClick?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void
  ) => JSX.Element;
}

export const Row = ({
  checked = false,
  keyValue = [],
  valueValue = [],
  dropdownValue,
  index,
  containerOffset,
  showDisabledDelete,
  isGroupable,
  groupedItems,
  // isTop,
  // isBottom,
  // handleMove,
  handleDeleteChild,
  handleUpdateParent,
  GetTokenPicker,
}: RowProps) => {
  const intl = useIntl();
  const keyEditorRef = useRef<HTMLDivElement | null>(null);
  const valueEditorRef = useRef<HTMLDivElement | null>(null);
  const [key, setKey] = useState<ValueSegment[]>(keyValue);
  const [pickerOffset, setPickerOffset] = useState<ButtonOffSet>();

  const handleGroup = () => {
    handleUpdateParent(
      {
        type: 'group',
        checked: false,
        items: groupedItems.map((groupedItem) => {
          return groupedItem.item;
        }),
      },
      index
    );

    // Delete groupedItems not including current item
    handleDeleteChild?.(groupedItems.filter((item) => item.index !== index).map((item) => item.index));
  };

  const deleteButton = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'delete button',
  });

  // const moveUpButton = intl.formatMessage({
  //   defaultMessage: 'Move up',
  //   description: 'Move up button',
  // });

  // const moveDownButton = intl.formatMessage({
  //   defaultMessage: 'Move down',
  //   description: 'Move down button',
  // });

  const makeGroupButton = intl.formatMessage({
    defaultMessage: 'Make Group',
    description: 'Make group button',
  });

  const rowMenuItems: IOverflowSetItemProps[] = [
    {
      key: deleteButton,
      disabled: !!showDisabledDelete,
      iconProps: {
        iconName: 'Delete',
      },
      iconOnly: true,
      name: deleteButton,
      onClick: handleDeleteChild,
    },
    // TODO: Allow Moving of Rows in querybuilder
    // {
    //   key: moveUpButton,
    //   disabled: true, //isTop,
    //   iconProps: {
    //     iconName: 'Up',
    //   },
    //   iconOnly: true,
    //   name: moveUpButton,
    //   onClick: () => handleMove?.(index, MoveOption.UP),
    // },
    // TODO: Allow Moving of Rows in querybuilder
    // {
    //   key: moveDownButton,
    //   disabled: true, //isBottom,
    //   iconProps: {
    //     iconName: 'Down',
    //   },
    //   iconOnly: true,
    //   name: moveDownButton,
    //   onClick: () => handleMove?.(index, MoveOption.DOWN),
    // },
    {
      key: makeGroupButton,
      disabled: !(isGroupable && checked),
      iconProps: {
        iconName: 'ViewAll',
      },
      iconOnly: true,
      name: makeGroupButton,
      onClick: handleGroup,
    },
  ];

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
    }
    if (newState.value.length === 0) {
      setKey([]);
    }
  };

  const handleKeySave = (newState: ChangeState) => {
    if (notEqual(keyValue, newState.value)) {
      setKey(newState.value);
      handleUpdateParent({ type: 'row', checked: checked, key: newState.value, dropdownVal: dropdownValue, value: valueValue }, index);
    }
  };

  const handleSelectedOption = (newState: ChangeState) => {
    handleUpdateParent({ type: 'row', checked: checked, key: keyValue, dropdownVal: newState.value[0].value, value: valueValue }, index);
  };

  const handleValueSave = (newState: ChangeState) => {
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
            editorBlur={handleKeySave}
            GetTokenPicker={GetTokenPicker}
            tokenPickerButtonProps={{ buttonOffset: pickerOffset }}
          />
        </div>
        <RowDropdown disabled={key.length === 0} selectedOption={dropdownValue} onChange={handleSelectedOption} />
        <div ref={valueEditorRef}>
          <StringEditor
            readonly={key.length === 0}
            className={'msla-querybuilder-row-value-input'}
            initialValue={valueValue}
            placeholder={rowValueInputPlaceholder}
            singleLine={true}
            GetTokenPicker={GetTokenPicker}
            editorBlur={handleValueSave}
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
