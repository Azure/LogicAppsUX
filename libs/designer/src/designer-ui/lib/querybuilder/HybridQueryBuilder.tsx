import { ValueSegmentType } from '../editor';
import { Group } from './Group';
import { checkHeights, getGroupedItems } from './helper';
import type { GroupedItems, GroupItemProps, QueryBuilderProps } from './index';
import { guid } from '@microsoft/logic-apps-designer';
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
