import type { ValueSegment } from '../editor';
import type { ChangeHandler, GetTokenPickerHandler } from '../editor/base';
import { Group } from './Group';
import { GroupDropdownOptions } from './GroupDropdown';
import { useFunctionalState, useUpdateEffect } from '@react-hookz/web';
import { useEffect, useRef, useState } from 'react';

export { GroupDropdownOptions };

export interface GroupedItems {
  index: number;
  item: GroupItemProps | RowItemProps;
}

type GroupItems = GroupItemProps | RowItemProps;

export enum GroupType {
  ROW = 'row',
  GROUP = 'group',
}
export interface RowItemProps {
  type: GroupType.ROW;
  checked?: boolean;
  key?: ValueSegment[];
  dropdownVal?: string;
  value?: ValueSegment[];
}
export interface GroupItemProps {
  type: GroupType.GROUP;
  checked?: boolean;
  selectedOption?: GroupDropdownOptions;
  items: GroupItems[];
}
export interface QueryBuilderProps {
  readonly?: boolean;
  groupProps: GroupItemProps;
  getTokenPicker: GetTokenPickerHandler;
  onChange?: ChangeHandler;
}

export const QueryBuilderEditor = ({ getTokenPicker, onChange, groupProps }: QueryBuilderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<number[]>([]);
  const [groupedItems, setGroupedItems] = useState<GroupedItems[]>([]);
  const [isGroupable, setIsGroupable] = useState(true);

  const [getRootProp, setRootProp] = useFunctionalState<GroupItemProps>(groupProps);

  useUpdateEffect(() => {
    onChange?.({ value: [], viewModel: { items: getRootProp() } });
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
        isTop={true}
        isBottom={true}
        getTokenPicker={getTokenPicker}
        groupProps={getRootProp()}
        isRootGroup={true}
        isGroupable={isGroupable}
        groupedItems={groupedItems}
        index={0}
        mustHaveItem={true}
        handleUpdateParent={handleUpdateParent}
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
