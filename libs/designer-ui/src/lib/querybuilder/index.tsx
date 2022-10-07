import type { ValueSegment } from '../editor';
import { Group } from './Group';
import { GroupDropdownOptions } from './GroupDropdown';
import type { IOverflowSetItemProps } from '@fluentui/react';
import { useFunctionalState } from '@react-hookz/web';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export { GroupDropdownOptions };

type GroupItems = GroupItemProps | RowItemProps;

export interface RowItemProps {
  type: 'row';
  checked?: boolean;
  key?: ValueSegment[];
  dropdownVal?: string;
  value?: ValueSegment[];
}
export interface GroupItemProps {
  type: 'group';
  checked?: boolean;
  selectedOption?: GroupDropdownOptions;
  items: GroupItems[];
}
export interface QueryBuilderProps {
  readonly?: boolean;
  groupProps: GroupItemProps;
  GetTokenPicker: (
    editorId: string,
    labelId: string,
    onClick?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void
  ) => JSX.Element;
}

export const QueryBuilderEditor = ({ GetTokenPicker, groupProps }: QueryBuilderProps) => {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerOffset, setContainerOffset] = useState(0);
  const [heights, setHeights] = useState<number[]>([]);
  const [groupedItems, setGroupedItems] = useState<(GroupItemProps | RowItemProps)[]>([]);
  const [isGroupable, setIsGroupable] = useState(true);

  const [getRootProp, setRootProp] = useFunctionalState<GroupItemProps>(groupProps);

  useEffect(() => {
    setHeights(checkHeights(getRootProp(), [], 0));
    if (containerRef.current) {
      setContainerOffset(containerRef.current.getBoundingClientRect().bottom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, getRootProp()]);

  useEffect(() => {
    console.log(getRootProp());
    if (new Set(heights).size === 1) {
      setIsGroupable(true);
      setGroupedItems(getGroupedItems(getRootProp(), []));
    } else {
      setIsGroupable(false);
    }
  }, [getRootProp, heights]);

  useEffect(() => {
    console.log(groupedItems);
  }, [groupedItems]);

  const handleUpdateParent = (newProps: GroupItemProps) => {
    setRootProp(newProps);
  };

  const moveUpButton = intl.formatMessage({
    defaultMessage: 'Move up',
    description: 'Move up button',
  });
  const moveDownButton = intl.formatMessage({
    defaultMessage: 'Move down',
    description: 'Move down button',
  });

  const handleGroup = () => {
    console.log('group');
  };

  const menuItems: IOverflowSetItemProps[] = [
    // TODO functinoality of Move/Group
    {
      key: moveUpButton,
      disabled: true,
      iconProps: {
        iconName: 'Up',
      },
      iconOnly: true,
      name: moveUpButton,
      onClick: handleGroup,
    },
    {
      key: moveDownButton,
      disabled: true,
      iconProps: {
        iconName: 'Down',
      },
      iconOnly: true,
      name: moveDownButton,
      onClick: handleGroup,
    },
  ];

  return (
    <div className="msla-querybuilder-container" ref={containerRef}>
      <Group
        containerOffset={containerOffset}
        GetTokenPicker={GetTokenPicker}
        menuItems={menuItems}
        groupProps={getRootProp()}
        isFirstGroup={true}
        isGroupable={isGroupable}
        groupedItems={groupedItems}
        index={0}
        mustHaveItem={true}
        handleUpdateParent={handleUpdateParent}
      />
    </div>
  );
};

// should i make this bfs instead of dfs?
const checkHeights = (item: GroupItemProps | RowItemProps, returnVal: number[], height: number): number[] => {
  if (item.checked) {
    returnVal.push(height);
  }
  if (item.type === 'group') {
    item.items.map((childItem) => checkHeights(childItem, returnVal, height + 1));
  }
  return returnVal;
};

const getGroupedItems = (
  item: GroupItemProps | RowItemProps,
  returnVal: (GroupItemProps | RowItemProps)[]
): (GroupItemProps | RowItemProps)[] => {
  if (item.checked) {
    returnVal.push({ ...item, checked: false });
  }
  if (item.type === 'group') {
    item.items.map((childItem) => getGroupedItems(childItem, returnVal));
  }
  return returnVal;
};
