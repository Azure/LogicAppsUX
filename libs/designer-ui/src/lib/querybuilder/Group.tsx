import type { GroupItemProps, RowItemProps } from '.';
import { Checkbox } from '../checkbox';
import type { ValueSegment } from '../editor';
import type { ChangeState } from '../editor/base';
import { AddSection } from './AddSection';
import type { GroupDropdownOptions } from './GroupDropdown';
import { GroupDropdown } from './GroupDropdown';
import { Row } from './Row';
import type { ICalloutProps, IIconProps, IOverflowSetItemProps, IOverflowSetStyles } from '@fluentui/react';
import { css, IconButton, DirectionalHint, TooltipHost, OverflowSet } from '@fluentui/react';
import { useFunctionalState } from '@react-hookz/web';
import { useEffect, useState } from 'react';
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

interface GroupProps {
  checked?: boolean;
  menuItems: IOverflowSetItemProps[];
  groupProps: GroupItemProps;
  isFirstGroup?: boolean;
  containerOffset: number;
  index: number;
  mustHaveItem?: boolean;
  handleDeleteChild?: (indexToDelete: number) => void;
  handleUngroupChild?: (indexToInsertAt: number) => void;
  handleUpdateParent: (newProps: GroupItemProps, index: number) => void;
  GetTokenPicker: (
    editorId: string,
    labelId: string,
    onClick?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void
  ) => JSX.Element;
}

export const Group = ({
  menuItems,
  groupProps,
  isFirstGroup,
  containerOffset,
  index,
  mustHaveItem,
  handleDeleteChild,
  handleUngroupChild,
  handleUpdateParent,
  GetTokenPicker,
}: GroupProps) => {
  const intl = useIntl();
  const [collapsed, setCollapsed] = useState(false);
  const [getCurrProps, setCurrProps] = useFunctionalState<GroupItemProps>(groupProps);

  // Update current props whenever parentProps changes
  useEffect(() => {
    if (JSON.stringify(groupProps) !== JSON.stringify(getCurrProps())) {
      setCurrProps(groupProps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupProps]);

  const handleDelete = (indexToDelete: number) => {
    if (getCurrProps().items.length <= 1) {
      handleDeleteChild?.(index);
    } else {
      const newItems = { ...getCurrProps() };
      newItems.items.splice(indexToDelete, 1);
      setCurrProps(newItems);
    }
  };

  const handleUngroup = (indexToAddAt: number, items: (GroupItemProps | RowItemProps)[]) => {
    let itemsToInsert = items;
    if (items.length === 0) {
      itemsToInsert = [{ type: 'row' }];
    }
    const newItems = { ...getCurrProps() };
    newItems.items.splice(indexToAddAt, 1, ...itemsToInsert);
    setCurrProps(newItems);
  };

  const deleteButton = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'delete button',
  });

  const unGroupButton = intl.formatMessage({
    defaultMessage: 'Ungroup',
    description: 'Ungroup button',
  });

  const groupMenuItems = [
    {
      key: deleteButton,
      disabled: getCurrProps().items.length <= 1 && mustHaveItem,
      iconProps: {
        iconName: 'Delete',
      },
      iconOnly: true,
      name: deleteButton,
      onClick: handleDeleteChild,
    },
    ...menuItems,
    {
      key: unGroupButton,
      disabled: isFirstGroup,
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

  const onRenderOverflowButton = (): JSX.Element => {
    const groupCommands = intl.formatMessage({
      defaultMessage: 'More commands',
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
    handleUpdateParent({ ...groupProps, selectedOption: newState.value[0].value as GroupDropdownOptions }, index);
  };

  const collapseLabel = intl.formatMessage({
    defaultMessage: 'Collapse',
    description: 'Label for collapsing group',
  });

  const collapseIconProps: IIconProps = {
    iconName: collapsed ? 'FullScreen' : 'BackToWindow',
  };

  return (
    <div className={css('msla-querybuilder-group-container', isFirstGroup && 'firstGroup')}>
      {!isFirstGroup ? <div className="msla-querybuilder-group-gutter-hook" /> : null}
      <div className={css('msla-querybuilder-group-content', collapsed && 'collapsed', isFirstGroup && 'firstGroup')}>
        {!collapsed ? (
          <>
            {!isFirstGroup ? (
              <Checkbox className="msla-querybuilder-group-checkbox" initialChecked={getCurrProps().checked} onChange={handleCheckbox} />
            ) : null}
            <div className="msla-querybuilder-row-section">
              <GroupDropdown selectedOption={getCurrProps().selectedOption} onChange={handleSelectedOption} />
              {getCurrProps().items.map((item, currIndex) => {
                return item.type === 'row' ? (
                  <Row
                    key={`row ${currIndex}`}
                    menuItems={menuItems}
                    checked={item.checked}
                    keyValue={item.key}
                    dropdownValue={item.dropdownVal}
                    valueValue={item.value}
                    containerOffset={containerOffset}
                    index={currIndex}
                    showDisabledDelete={getCurrProps().items.length <= 1 && mustHaveItem}
                    handleDeleteChild={() => handleDelete(currIndex)}
                    handleUpdateParent={handleUpdateNewParent}
                    GetTokenPicker={GetTokenPicker}
                  />
                ) : (
                  <Group
                    key={`group ${currIndex}`}
                    menuItems={menuItems}
                    containerOffset={containerOffset}
                    groupProps={{
                      type: 'group',
                      items: item.items,
                      selectedOption: item.selectedOption,
                      checked: item.checked,
                    }}
                    index={currIndex}
                    mustHaveItem={getCurrProps().items.length <= 1 && mustHaveItem}
                    handleDeleteChild={() => handleDelete(currIndex)}
                    handleUngroupChild={() => handleUngroup(currIndex, item.items)}
                    handleUpdateParent={handleUpdateNewParent}
                    GetTokenPicker={GetTokenPicker}
                  />
                );
              })}
              {
                <>
                  {getCurrProps().items.length === 0 ? (
                    <Row
                      index={0}
                      menuItems={menuItems}
                      containerOffset={containerOffset}
                      showDisabledDelete={getCurrProps().items.length <= 1 && mustHaveItem}
                      GetTokenPicker={GetTokenPicker}
                      handleDeleteChild={handleDeleteChild}
                      handleUpdateParent={handleUpdateNewParent}
                    />
                  ) : null}
                  <AddSection
                    handleUpdateParent={handleUpdateNewParent}
                    index={getCurrProps().items.length}
                    addEmptyRow={getCurrProps().items.length === 0}
                  />
                </>
              }
            </div>
          </>
        ) : (
          <GroupDropdown selectedOption={getCurrProps().selectedOption} onChange={handleSelectedOption} />
        )}
        <div className={css('msla-querybuilder-group-controlbar', collapsed && 'collapsed')}>
          {!isFirstGroup ? (
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
                onRenderItem={function (_item: IOverflowSetItemProps) {
                  throw new Error('No items in overflowset');
                }}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
