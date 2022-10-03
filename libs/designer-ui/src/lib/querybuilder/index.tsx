import type { ValueSegment } from '../editor';
import { Group } from './Group';
import { GroupDropdownOptions } from './GroupDropdown';
import type { IOverflowSetItemProps } from '@fluentui/react';
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

  const [rootProp, setRootProp] = useState<GroupItemProps | RowItemProps>(groupProps);

  useEffect(() => {
    console.log(rootProp);
    if (containerRef.current) {
      setContainerOffset(containerRef.current.getBoundingClientRect().bottom);
    }
  }, [containerRef, rootProp]);

  const handleUpdateParent = (newProps: GroupItemProps | RowItemProps) => {
    setRootProp(newProps);
  };

  const deleteButton = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'delete button',
  });
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

  const handleDelete = () => {
    console.log('delete');
  };

  const rowMenuItems: IOverflowSetItemProps[] = [
    {
      key: deleteButton,
      disabled: false,
      iconProps: {
        iconName: 'Delete',
      },
      iconOnly: true,
      name: deleteButton,
      onClick: handleDelete,
    },
    {
      key: moveUpButton,
      disabled: false,
      iconProps: {
        iconName: 'Up',
      },
      iconOnly: true,
      name: moveUpButton,
      onClick: handleDelete,
    },
    {
      key: moveDownButton,
      disabled: false,
      iconProps: {
        iconName: 'Down',
      },
      iconOnly: true,
      name: moveDownButton,
      onClick: handleDelete,
    },
    {
      key: makeGroupButton,
      disabled: false,
      iconProps: {
        iconName: 'ViewAll',
      },
      iconOnly: true,
      name: makeGroupButton,
      onClick: handleDelete,
    },
  ];
  const groupMenuItems: IOverflowSetItemProps[] = [
    ...rowMenuItems,
    {
      key: unGroupButton,
      disabled: false,
      iconProps: {
        iconName: 'ViewAll2',
      },
      iconOnly: true,
      name: unGroupButton,
      onClick: handleDelete,
    },
  ];

  return (
    <div className="msla-querybuilder-container" ref={containerRef}>
      <Group
        containerOffset={containerOffset}
        GetTokenPicker={GetTokenPicker}
        groupMenuItems={groupMenuItems}
        rowMenuItems={rowMenuItems}
        groupProps={rootProp as GroupItemProps}
        isFirstGroup={true}
        index={0}
        handleUpdateParent={handleUpdateParent}
      />
    </div>
  );
};
