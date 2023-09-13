import type { ValueSegment } from '../editor';
import { ValueSegmentType } from '../editor';
import type { ChangeHandler, GetTokenPickerHandler } from '../editor/base';
import { Group } from './Group';
import { GroupDropdownOptions } from './GroupDropdown';
import { RowDropdownOptions } from './RowDropdown';
import { checkHeights, getGroupedItems } from './helper';
import { guid } from '@microsoft/utils-logic-apps';
import { useFunctionalState, useUpdateEffect } from '@react-hookz/web';
import { useEffect, useRef, useState } from 'react';

export { GroupDropdownOptions, RowDropdownOptions };

export interface GroupedItems {
  index: number;
  item: GroupItemProps | RowItemProps;
}

export type GroupItems = GroupItemProps | RowItemProps;

export enum GroupType {
  ROW = 'row',
  GROUP = 'group',
}
export interface RowItemProps {
  type: GroupType.ROW;
  checked?: boolean;
  operand1: ValueSegment[];
  operator: string;
  operand2: ValueSegment[];
}

export interface GroupItemProps {
  type: GroupType.GROUP;
  checked?: boolean;
  condition?: GroupDropdownOptions;
  items: GroupItems[];
}

export interface QueryBuilderProps {
  readonly?: boolean;
  groupProps: GroupItemProps;
  getTokenPicker: GetTokenPickerHandler;
  onChange?: ChangeHandler;
}

const emptyValue = [{ id: guid(), type: ValueSegmentType.LITERAL, value: '' }];

export const QueryBuilderEditor = ({ getTokenPicker, groupProps, readonly, onChange }: QueryBuilderProps) => {
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
