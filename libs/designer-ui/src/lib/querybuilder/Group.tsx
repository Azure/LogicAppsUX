import type { GroupedItems, GroupItemProps, RowItemProps } from '.';
import { RowDropdownOptions, GroupType } from '.';
import { Checkbox } from '../checkbox';
import type { ValueSegment } from '../editor';
import type { ChangeState, GetTokenPickerHandler, loadParameterValueFromStringHandler } from '../editor/base';
import { AddSection } from './AddSection';
import type { GroupDropdownOptions } from './GroupDropdown';
import { GroupDropdown } from './GroupDropdown';
import { Row } from './Row';
import type { ICalloutProps, IIconProps, IOverflowSetItemProps, IOverflowSetStyles } from '@fluentui/react';
import { css, IconButton, DirectionalHint, TooltipHost, OverflowSet } from '@fluentui/react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const overflowStyle: Partial<IOverflowSetStyles> = {
  root: {
    height: '32px',
    backgroundColor: 'transparent',
  },
};

const menuIconProps: IIconProps = {
  iconName: 'More',
};

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.leftCenter,
};

export const MoveOption = {
  UP: 'up',
  DOWN: 'down',
};
export type MoveOption = (typeof MoveOption)[keyof typeof MoveOption];

interface GroupProps {
  readonly?: boolean;
  groupProps: GroupItemProps;
  isRootGroup?: boolean;
  isGroupable: boolean;
  groupedItems: GroupedItems[];
  index: number;
  mustHaveItem?: boolean;
  isTop: boolean;
  isBottom: boolean;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: loadParameterValueFromStringHandler;
  getTokenPicker: GetTokenPickerHandler;
  handleMove?: (childIndex: number, moveOption: MoveOption, itemToMove?: GroupItemProps | RowItemProps) => void;
  handleDeleteChild?: (indexToDelete: number | number[]) => void;
  handleUngroupChild?: (indexToInsertAt: number) => void;
  handleUpdateParent: (newProps: GroupItemProps, index: number) => void;
}

export const Group = ({
  groupProps,
  isRootGroup,
  isGroupable,
  groupedItems,
  index,
  mustHaveItem,
  isTop,
  isBottom,
  getTokenPicker,
  readonly,
  handleMove,
  handleDeleteChild,
  handleUngroupChild,
  handleUpdateParent,
  ...baseEditorProps
}: GroupProps) => {
  const intl = useIntl();
  const [collapsed, setCollapsed] = useState(false);

  const handleGroup = () => {
    handleUpdateParent(
      {
        type: GroupType.GROUP,
        checked: false,
        items: groupedItems.map((groupedItem) => {
          return groupedItem.item;
        }),
      },
      index
    );

    // Delete groupedItems not including currentItem
    handleDeleteChild?.(groupedItems.filter((item) => item.index !== index).map((item) => item.index));
  };

  const handleUngroup = (indexToAddAt: number, items: (GroupItemProps | RowItemProps)[]) => {
    let itemsToInsert = items;
    if (items.length === 0) {
      itemsToInsert = [{ type: GroupType.ROW, operand1: [], operand2: [], operator: RowDropdownOptions.EQUALS }];
    }
    const newItems = { ...groupProps };
    if (!newItems.items) {
      newItems.items = [];
    }
    newItems.items.splice(indexToAddAt, 1, ...itemsToInsert);
    handleUpdateParent(newItems, index);
  };

  const deleteButton = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 'bGtEPd',
    description: 'delete button',
  });

  const moveUpButton = intl.formatMessage({
    defaultMessage: 'Move up',
    id: 'xFQdSb',
    description: 'Move up button',
  });

  const moveDownButton = intl.formatMessage({
    defaultMessage: 'Move down',
    id: 'inn/0k',
    description: 'Move down button',
  });

  const makeGroupButton = intl.formatMessage({
    defaultMessage: 'Make group',
    id: 'J7PN35',
    description: 'Make group button',
  });

  const unGroupButton = intl.formatMessage({
    defaultMessage: 'Ungroup',
    id: 'OdNhwc',
    description: 'Ungroup button',
  });

  const groupMenuItems: IOverflowSetItemProps[] = [
    {
      key: deleteButton,
      disabled: (groupProps.items?.length || 0) <= 1 && mustHaveItem,
      iconProps: {
        iconName: 'Delete',
      },
      iconOnly: true,
      name: deleteButton,
      onClick: () => handleDeleteChild?.(index),
    },
    {
      key: moveUpButton,
      disabled: isTop,
      iconProps: {
        iconName: 'Up',
      },
      iconOnly: true,
      name: moveUpButton,
      onClick: () => handleMove?.(index, MoveOption.UP),
    },
    {
      key: moveDownButton,
      disabled: isBottom,
      iconProps: {
        iconName: 'Down',
      },
      iconOnly: true,
      name: moveDownButton,
      onClick: () => handleMove?.(index, MoveOption.DOWN),
    },
    {
      key: makeGroupButton,
      disabled: !(isGroupable && groupProps.checked),
      iconProps: {
        iconName: 'ViewAll',
      },
      iconOnly: true,
      name: makeGroupButton,
      onClick: handleGroup,
    },
    {
      key: unGroupButton,
      disabled: isRootGroup,
      iconProps: {
        iconName: 'ViewAll2',
      },
      iconOnly: true,
      name: unGroupButton,
      onClick: handleUngroupChild,
    },
  ];

  const handleUpdateNewParent = (newState: GroupItemProps | RowItemProps, currIndex: number) => {
    const newItems = { ...groupProps };
    newItems.items[currIndex] = newState;
    handleUpdateParent(newItems, index);
  };

  const handleDelete = (indicesToDelete: number | number[]) => {
    // Is an array of indices to delete
    const newItems = { ...groupProps };
    if (!newItems.items) {
      newItems.items = [];
    }
    if (Array.isArray(indicesToDelete)) {
      if (indicesToDelete.length === newItems.items.length) {
        handleDeleteChild?.(index);
      } else {
        for (let i = indicesToDelete.length - 1; i >= 0; i--) {
          newItems.items.splice(indicesToDelete[i], 1);
        }
        handleUpdateParent(newItems, index);
      }
    } else if ((groupProps.items?.length || 0) <= 1) {
      handleDeleteChild?.(index);
    } else {
      newItems.items.splice(indicesToDelete, 1);
      handleUpdateParent(newItems, index);
    }
  };

  const handleMoveChild = (childIndex: number, moveOption: MoveOption, itemToMove?: GroupItemProps | RowItemProps) => {
    const newItems = { ...groupProps };
    if (!newItems.items) {
      newItems.items = [];
    }
    const isMovingUp = moveOption === MoveOption.UP;
    const isAtTop = childIndex === 0;
    const isAtBottom = childIndex === (groupProps.items?.length || 0) - 1;

    if (itemToMove) {
      // This is a cross-group move from a nested group
      if (isMovingUp) {
        // Insert the item above the group it came from
        newItems.items.splice(childIndex, 0, itemToMove);
      } else {
        // Insert the item below the group it came from
        newItems.items.splice(childIndex + 1, 0, itemToMove);
      }
      handleUpdateParent(newItems, index);
      return;
    }

    // Handle moving within the current group
    if ((isMovingUp && !isAtTop) || (!isMovingUp && !isAtBottom)) {
      const child = newItems.items[childIndex];
      const targetIndex = childIndex + (isMovingUp ? -1 : 1);
      const targetItem = newItems.items[targetIndex];

      // Safety check - ensure both child and targetItem exist
      if (!child || !targetItem) {
        return;
      }

      // Special case: if moving down into a group, add to the top of that group
      if (!isMovingUp && targetItem.type === GroupType.GROUP) {
        if (!targetItem.items) {
          targetItem.items = [];
        }
        targetItem.items.unshift(child);
        newItems.items.splice(childIndex, 1);
      }
      // Special case: if moving up into a group, add to the bottom of that group
      else if (isMovingUp && targetItem.type === GroupType.GROUP) {
        if (!targetItem.items) {
          targetItem.items = [];
        }
        targetItem.items.push(child);
        newItems.items.splice(childIndex, 1);
      }
      // Normal swap
      else {
        newItems.items[childIndex] = targetItem;
        newItems.items[targetIndex] = child;
      }
      handleUpdateParent(newItems, index);
      return;
    }

    // Handle boundary conditions - need to move to parent level or into adjacent groups
    if (isMovingUp && isAtTop) {
      // Move out of group to above the group, or into the group above if it exists
      const itemToMove = newItems.items[childIndex];
      if (!itemToMove) {
        return;
      }
      newItems.items.splice(childIndex, 1);
      handleUpdateParent(newItems, index);

      // Signal to parent to handle cross-group movement
      if (handleMove) {
        handleMove(index, MoveOption.UP, itemToMove);
      }
    } else if (!isMovingUp && isAtBottom) {
      // Move out of group to below the group, or into the group below if it exists
      const itemToMove = newItems.items[childIndex];
      if (!itemToMove) {
        return;
      }
      newItems.items.splice(childIndex, 1);
      handleUpdateParent(newItems, index);

      // Signal to parent to handle cross-group movement
      if (handleMove) {
        handleMove(index, MoveOption.DOWN, itemToMove);
      }
    }
  };

  const onRenderOverflowButton = (): JSX.Element => {
    const groupCommands = intl.formatMessage({
      defaultMessage: 'More commands',
      id: 'GdGm4T',
      description: 'Label for commands in row',
    });
    return (
      <TooltipHost calloutProps={calloutProps} content={groupCommands}>
        <IconButton
          ariaLabel={groupCommands}
          styles={overflowStyle}
          menuIconProps={menuIconProps}
          menuProps={groupMenuItems && { items: groupMenuItems }}
        />
      </TooltipHost>
    );
  };

  const handleCheckbox = () => {
    handleUpdateParent({ ...groupProps, checked: !groupProps.checked }, index);
  };

  const handleSelectedOption = (newState: ChangeState) => {
    handleUpdateParent({ ...groupProps, condition: newState.value[0].value as GroupDropdownOptions }, index);
  };

  const collapseLabel = intl.formatMessage({
    defaultMessage: 'Collapse',
    id: 'BoMvF2',
    description: 'Label for collapsing group',
  });

  const collapseIconProps: IIconProps = {
    iconName: collapsed ? 'FullScreen' : 'BackToWindow',
  };

  return (
    <div className={css('msla-querybuilder-group-container', isRootGroup && 'firstGroup')}>
      {isRootGroup ? null : <div className="msla-querybuilder-group-gutter-hook" />}
      <div className={css('msla-querybuilder-group-content', collapsed && 'collapsed', isRootGroup && 'firstGroup')}>
        {collapsed ? (
          <GroupDropdown condition={groupProps.condition} onChange={handleSelectedOption} key={groupProps.condition} readonly={readonly} />
        ) : (
          <>
            {isRootGroup ? null : (
              <Checkbox
                disabled={readonly}
                className="msla-querybuilder-group-checkbox"
                initialChecked={groupProps.checked}
                onChange={handleCheckbox}
                key={JSON.stringify(groupProps.checked)}
              />
            )}
            <div className="msla-querybuilder-row-section">
              <GroupDropdown
                condition={groupProps.condition}
                onChange={handleSelectedOption}
                key={groupProps.condition}
                readonly={readonly}
              />
              {(groupProps.items || []).map((item, currIndex) => {
                return item.type === GroupType.ROW ? (
                  <Row
                    readonly={readonly}
                    key={`row ${currIndex} ${JSON.stringify(item.operand1)} ${JSON.stringify(item.operand2)}`}
                    checked={item.checked}
                    operand1={item.operand1}
                    operator={item.operator}
                    operand2={item.operand2}
                    index={currIndex}
                    isGroupable={isGroupable}
                    showDisabledDelete={(groupProps.items?.length || 0) <= 1 && mustHaveItem}
                    groupedItems={groupedItems}
                    isTop={isTop && currIndex === 0 && !!isRootGroup}
                    isBottom={isBottom && currIndex === (groupProps.items?.length || 0) - 1 && !!isRootGroup}
                    getTokenPicker={getTokenPicker}
                    handleMove={handleMoveChild}
                    handleDeleteChild={handleDelete}
                    handleUpdateParent={handleUpdateNewParent}
                    {...baseEditorProps}
                  />
                ) : (
                  <Group
                    readonly={readonly}
                    key={`${GroupType.GROUP} ${currIndex}`}
                    groupProps={{
                      type: GroupType.GROUP,
                      items: item.items,
                      condition: item.condition,
                      checked: item.checked,
                    }}
                    index={currIndex}
                    isGroupable={isGroupable}
                    groupedItems={groupedItems}
                    mustHaveItem={(groupProps.items?.length || 0) <= 1 && mustHaveItem}
                    isTop={isTop && currIndex === 0}
                    isBottom={isBottom && currIndex === (groupProps.items?.length || 0) - 1}
                    getTokenPicker={getTokenPicker}
                    handleMove={handleMoveChild}
                    handleDeleteChild={handleDelete}
                    handleUngroupChild={() => handleUngroup(currIndex, item.items)}
                    handleUpdateParent={handleUpdateNewParent}
                    {...baseEditorProps}
                  />
                );
              })}
              {
                <>
                  {(groupProps.items?.length || 0) === 0 ? (
                    <Row
                      readonly={readonly}
                      key={'row 0'}
                      index={0}
                      isGroupable={isGroupable}
                      showDisabledDelete={(groupProps.items?.length || 0) <= 1 && mustHaveItem}
                      isTop={isTop && !!isRootGroup}
                      isBottom={isBottom && !!isRootGroup}
                      groupedItems={groupedItems}
                      getTokenPicker={getTokenPicker}
                      handleMove={handleMoveChild}
                      handleDeleteChild={handleDeleteChild}
                      handleUpdateParent={handleUpdateNewParent}
                      {...baseEditorProps}
                    />
                  ) : null}
                  <AddSection
                    readonly={readonly}
                    handleUpdateParent={handleUpdateNewParent}
                    index={groupProps.items?.length || 0}
                    addEmptyRow={(groupProps.items?.length || 0) === 0}
                  />
                </>
              }
            </div>
          </>
        )}
        <div className={css('msla-querybuilder-group-controlbar', collapsed && 'collapsed')}>
          {isRootGroup ? null : (
            <>
              <TooltipHost calloutProps={calloutProps} content={collapseLabel}>
                <IconButton
                  ariaLabel={collapseLabel}
                  styles={overflowStyle}
                  menuIconProps={collapseIconProps}
                  onClick={() => setCollapsed(!collapsed)}
                />
              </TooltipHost>
              <OverflowSet
                className="msla-querybuilder-group-more"
                styles={overflowStyle}
                items={[]}
                overflowItems={groupMenuItems}
                onRenderOverflowButton={onRenderOverflowButton}
                onRenderItem={(_item: IOverflowSetItemProps) => {
                  throw new Error('No items in overflowset');
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
