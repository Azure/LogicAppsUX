import type { GroupedItems, GroupItems } from '.';
import { GroupType } from '.';
import { Checkbox } from '../checkbox';
import constants from '../constants';
import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { ChangeState, GetTokenPickerHandler } from '../editor/base';
import { TokenPickerButtonLocation } from '../editor/base/plugins/tokenpickerbutton';
import { notEqual } from '../editor/base/utils/helper';
import { StringEditor } from '../editor/string';
import type { MoveOption } from './Group';
import { RowDropdown, RowDropdownOptions } from './RowDropdown';
import { operandNotEmpty } from './helper';
import type { ICalloutProps, IIconProps, IOverflowSetItemProps, IOverflowSetStyles } from '@fluentui/react';
import { css, IconButton, DirectionalHint, TooltipHost, OverflowSet } from '@fluentui/react';
import { guid } from '@microsoft/utils-logic-apps';
import { useState } from 'react';
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

const emptyValueSegmentArray: ValueSegment[] = [{ type: ValueSegmentType.LITERAL, value: '', id: guid() }];

type RowProps = {
  checked?: boolean;
  operand1?: ValueSegment[];
  operand2?: ValueSegment[];
  operator?: string;
  index: number;
  showDisabledDelete?: boolean;
  isGroupable?: boolean;
  groupedItems: GroupedItems[];
  isTop: boolean;
  isBottom: boolean;
  getTokenPicker: GetTokenPickerHandler;
  readonly?: boolean;
  handleMove?: (childIndex: number, moveOption: MoveOption) => void;
  handleDeleteChild?: (indexToDelete: number | number[]) => void;
  forceSingleCondition?: boolean;
  handleUpdateParent: (newProps: GroupItems, index: number) => void;
  clearEditorOnTokenInsertion?: boolean;
  isSimpleQueryBuilder?: boolean;
};

export const Row = ({
  checked = false,
  operand1 = [],
  operand2 = [],
  operator,
  index,
  showDisabledDelete,
  isGroupable,
  groupedItems,
  getTokenPicker,
  // isTop,
  // isBottom,
  // handleMove,
  forceSingleCondition,
  readonly,
  clearEditorOnTokenInsertion,
  isSimpleQueryBuilder,
  handleDeleteChild,
  handleUpdateParent,
}: RowProps) => {
  const intl = useIntl();
  const [key, setKey] = useState<ValueSegment[]>(operand1);

  const handleGroup = () => {
    handleUpdateParent(
      {
        type: GroupType.GROUP,
        checked: false,
        items: [...groupedItems].map((groupedItem) => {
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
      onClick: () => handleDeleteChild?.(index),
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

  const handleKeyChange = (newState: ChangeState) => {
    if (notEqual(operand1, newState.value)) {
      setKey(newState.value);
    }
    if (newState.value.length === 0) {
      setKey([]);
    }
  };

  const handleKeySave = (newState: ChangeState) => {
    if (notEqual(operand1, newState.value)) {
      setKey(newState.value);
      handleUpdateParent(
        {
          type: GroupType.ROW,
          checked: checked,
          operand1: newState.value,
          operator: operator ?? 'equals',
          operand2: operandNotEmpty(operand2) ? operand2 : emptyValueSegmentArray,
        },
        index
      );
    }
  };

  const handleSelectedOption = (newState: ChangeState) => {
    handleUpdateParent(
      {
        type: GroupType.ROW,
        checked: checked,
        operand1: operandNotEmpty(operand1) ? operand1 : emptyValueSegmentArray,
        operator: newState.value[0].value,
        operand2: operandNotEmpty(operand2) ? operand2 : emptyValueSegmentArray,
      },
      index
    );
  };

  const handleValueSave = (newState: ChangeState) => {
    if (notEqual(operand2, newState.value)) {
      handleUpdateParent(
        {
          type: GroupType.ROW,
          checked: checked,
          operand1: operandNotEmpty(operand1) ? operand1 : emptyValueSegmentArray,
          operator: operator ?? 'equals',
          operand2: newState.value,
        },
        index
      );
    }
  };

  const handleCheckbox = () => {
    handleUpdateParent(
      { type: GroupType.ROW, checked: !checked, operand1: operand1, operator: operator ?? RowDropdownOptions.EQUALS, operand2: operand2 },
      index
    );
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
    <div className={css('msla-querybuilder-row-container', !forceSingleCondition && 'showBorder')}>
      {forceSingleCondition ? null : (
        <>
          <div className="msla-querybuilder-row-gutter-hook" />
          <Checkbox
            disabled={readonly}
            className="msla-querybuilder-row-checkbox"
            initialChecked={checked}
            onChange={handleCheckbox}
            key={JSON.stringify(checked)}
          />
        </>
      )}
      <div className="msla-querybuilder-row-content">
        <StringEditor
          valueType={constants.SWAGGER.TYPE.ANY}
          readonly={readonly}
          className={'msla-querybuilder-row-value-input'}
          initialValue={operand1}
          placeholder={rowValueInputPlaceholder}
          getTokenPicker={getTokenPicker}
          clearEditorOnTokenInsertion={clearEditorOnTokenInsertion}
          onChange={handleKeyChange}
          editorBlur={handleKeySave}
          tokenPickerButtonProps={{
            location: TokenPickerButtonLocation.Left,
            newlineVerticalOffset: 16,
            horizontalOffSet: isSimpleQueryBuilder ? undefined /* uses default of 38*/ : 33,
          }}
        />
        <RowDropdown disabled={readonly || key.length === 0} condition={operator} onChange={handleSelectedOption} key={operator} />
        <StringEditor
          valueType={constants.SWAGGER.TYPE.ANY}
          readonly={readonly || key.length === 0}
          className={'msla-querybuilder-row-value-input'}
          initialValue={operand2}
          placeholder={rowValueInputPlaceholder}
          getTokenPicker={getTokenPicker}
          editorBlur={handleValueSave}
          clearEditorOnTokenInsertion={clearEditorOnTokenInsertion}
          tokenPickerButtonProps={{ location: TokenPickerButtonLocation.Left, newlineVerticalOffset: 16, horizontalOffSet: 33 }}
        />
      </div>
      {forceSingleCondition ? null : (
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
      )}
    </div>
  );
};
