import { ValueSegmentType } from '../editor';
import { Group } from './Group';
import { GroupType } from './index';
import type { GroupedItems, GroupItemProps, QueryBuilderProps, RowItemProps } from './index';
import { guid } from '@microsoft/utils-logic-apps';
import { useFunctionalState, useUpdateEffect } from '@react-hookz/web';
import { useEffect, useRef, useState } from 'react';

const emptyValue = [{ id: guid(), type: ValueSegmentType.LITERAL, value: '' }];

export const HybridQueryBuilderEditor = ({ getTokenPicker, groupProps, readonly, onChange }: QueryBuilderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<number[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItems[]>([]);
  const [isGroupable, setIsGroupable] = useState(true);

  const [getRootProp, setRootProp] = useFunctionalState<GroupItemProps>(groupProps);

  useUpdateEffect(() => {
    onChange?.({ value: emptyValue, viewModel: JSON.parse(JSON.stringify({ items: getRootProp() })) });
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
        handleUpdateParent={handleUpdateParent}
        getTokenPicker={getTokenPicker}
      />
    </div>
  );
};

const checkHeights = (item: GroupItemProps | RowItemProps, returnVal: number[], height: number): number[] => {
  if (item.checked) {
    returnVal.push(height);
  }
  if (item.type === GroupType.GROUP) {
    item.items.map((childItem) => checkHeights(childItem, returnVal, height + 1));
  }
  return returnVal;
};

const getGroupedItems = (item: GroupItemProps | RowItemProps, returnVal: GroupedItems[], index: number): GroupedItems[] => {
  if (item.checked) {
    returnVal.push({ item: { ...item, checked: false }, index: index });
  }
  if (item.type === GroupType.GROUP) {
    item.items.map((childItem, index) => getGroupedItems(childItem, returnVal, index));
  }
  return returnVal;
};
