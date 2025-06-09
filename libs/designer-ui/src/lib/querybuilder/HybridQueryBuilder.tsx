import { createEmptyLiteralValueSegment } from '../editor/base/utils/helper';
import { Group, MoveOption } from './Group';
import { checkHeights, getGroupedItems } from './helper';
import type { GroupedItems, GroupItemProps, QueryBuilderProps, RowItemProps } from './index';
import { GroupType } from './index';
import { useFunctionalState, useUpdateEffect } from '@react-hookz/web';
import { useEffect, useRef, useState } from 'react';

export const HybridQueryBuilderEditor = ({ getTokenPicker, groupProps, readonly, onChange }: QueryBuilderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<number[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItems[]>([]);
  const [isGroupable, setIsGroupable] = useState(true);

  const [getRootProp, setRootProp] = useFunctionalState<GroupItemProps>(groupProps);

  useUpdateEffect(() => {
    onChange?.({ value: [createEmptyLiteralValueSegment()], viewModel: JSON.parse(JSON.stringify({ items: getRootProp() })) });
    setHeights(checkHeights(getRootProp(), [], 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getRootProp()]);

  useEffect(() => {
    if (new Set(heights).size === 1) {
      setIsGroupable(true);
      setGroupedItems(getGroupedItems(getRootProp(), [], 0));
    } else {
      setIsGroupable(false);
    }
  }, [getRootProp, heights]);

  const handleUpdateParent = (newProps: GroupItemProps) => {
    setRootProp(newProps);
  };

  // Handle complex move operations including cross-group moves
  const handleRootMove = (childIndex: number, moveOption: MoveOption, itemToMove?: GroupItemProps | RowItemProps) => {
    const rootProps = getRootProp();
    const newItems = { ...rootProps };
    const isMovingUp = moveOption === MoveOption.UP;

    if (itemToMove) {
      // This is a cross-group move - item was removed from a child group
      if (isMovingUp) {
        // Insert the item above the group it came from
        newItems.items.splice(childIndex, 0, itemToMove);
      } else {
        // Insert the item below the group it came from
        newItems.items.splice(childIndex + 1, 0, itemToMove);
      }
    } else {
      // This is a normal within-root move
      const isAtTop = childIndex === 0;
      const isAtBottom = childIndex === newItems.items.length - 1;

      // Handle normal swapping within root
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
      }
    }

    setRootProp(newItems);
  };

  return (
    <div className="msla-querybuilder-container" ref={containerRef}>
      <Group
        readonly={readonly}
        isTop={true}
        isBottom={true}
        groupProps={getRootProp()}
        isRootGroup={true}
        isGroupable={isGroupable}
        groupedItems={groupedItems}
        index={0}
        mustHaveItem={true}
        handleMove={handleRootMove}
        handleUpdateParent={handleUpdateParent}
        getTokenPicker={getTokenPicker}
      />
    </div>
  );
};
