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

  const [getRootProp, setRootProp] = useFunctionalState<GroupItemProps | RowItemProps>(groupProps);

  useEffect(() => {
    console.log(getRootProp());
    if (containerRef.current) {
      setContainerOffset(containerRef.current.getBoundingClientRect().bottom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, getRootProp()]);

  const handleUpdateParent = (newProps: GroupItemProps | RowItemProps) => {
    setRootProp(newProps);
  };

  // TODO Functionality
  const moveUpButton = intl.formatMessage({
    defaultMessage: 'Move up',
    description: 'Move up button',
  });
  const moveDownButton = intl.formatMessage({
    defaultMessage: 'Move down',
    description: 'Move down button',
  });
  const makeGroupButton = intl.formatMessage({
    defaultMessage: 'Make Group',
    description: 'Make group button',
  });

  const unGroupButton = intl.formatMessage({
    defaultMessage: 'Ungroup',
    description: 'Ungroup button',
  });

  const handleGroup = () => {
    console.log('group');
  };

  const rowMenuItems: IOverflowSetItemProps[] = [
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
    {
      key: makeGroupButton,
      disabled: true,
      iconProps: {
        iconName: 'ViewAll',
      },
      iconOnly: true,
      name: makeGroupButton,
      onClick: handleGroup,
    },
  ];

  const groupMenuItems: IOverflowSetItemProps[] = [
    ...rowMenuItems,
    // TODO functinoality of Move/Group
    {
      key: unGroupButton,
      disabled: true,
      iconProps: {
        iconName: 'ViewAll2',
      },
      iconOnly: true,
      name: unGroupButton,
      onClick: handleGroup,
    },
  ];

  return (
    <div className="msla-querybuilder-container" ref={containerRef}>
      <Group
        containerOffset={containerOffset}
        GetTokenPicker={GetTokenPicker}
        groupMenuItems={groupMenuItems}
        rowMenuItems={rowMenuItems}
        groupProps={getRootProp() as GroupItemProps}
        isFirstGroup={true}
        index={0}
        handleUpdateParent={handleUpdateParent}
      />
    </div>
  );
};
