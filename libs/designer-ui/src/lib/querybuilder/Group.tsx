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
  groupMenuItems: IOverflowSetItemProps[];
  rowMenuItems: IOverflowSetItemProps[];
  groupProps: GroupItemProps;
  isFirstGroup?: boolean;
  containerOffset: number;
  index: number;
  handleDeleteChild?: (indexToDelete: number) => void;
  handleUpdateParent: (newProps: GroupItemProps | RowItemProps, index: number) => void;
  GetTokenPicker: (
    editorId: string,
    labelId: string,
    onClick?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void
  ) => JSX.Element;
}

export const Group = ({
  groupMenuItems,
  rowMenuItems,
  groupProps,
  isFirstGroup,
  containerOffset,
  index,
  handleDeleteChild,
  handleUpdateParent,
  GetTokenPicker,
}: GroupProps) => {
  const intl = useIntl();
  const [collapsed, setCollapsed] = useState(false);
  const [currProps, setCurrProps] = useState<GroupItemProps>(groupProps);

  const deleteButton = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'delete button',
  });

  const handleDelete = (indexToDelete: number) => {
    const newItems = { ...currProps };
    newItems.items.splice(indexToDelete, 1);
    setCurrProps(newItems);
  };

  const moreGroupMenuItems = [
    {
      key: deleteButton,
      disabled: false,
      iconProps: {
        iconName: 'Delete',
      },
      iconOnly: true,
      name: deleteButton,
      onClick: handleDeleteChild,
    },
    ...groupMenuItems,
  ];

  useEffect(() => {
    handleUpdateParent(currProps, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currProps]);

  const handleUpdateNewParent = (newState: GroupItemProps | RowItemProps, index: number) => {
    const newItems = { ...currProps };
    newItems.items[index] = newState;
    setCurrProps(newItems);
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
          menuProps={moreGroupMenuItems && { items: moreGroupMenuItems }}
        />
      </TooltipHost>
    );
  };

  const handleCheckbox = () => {
    setCurrProps({ ...groupProps, checked: !groupProps.checked });
  };

  const handleSelectedOption = (newState: ChangeState) => {
    setCurrProps({ ...groupProps, selectedOption: newState.value[0].value as GroupDropdownOptions });
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
              <Checkbox className="msla-querybuilder-group-checkbox" initialChecked={groupProps.checked} onChange={handleCheckbox} />
            ) : null}
            <div className="msla-querybuilder-row-section">
              <GroupDropdown selectedOption={groupProps.selectedOption} onChange={handleSelectedOption} />
              {groupProps.items.map((item, currIndex) => {
                return item.type === 'row' ? (
                  <Row
                    key={`row ${currIndex}`}
                    rowMenuItems={rowMenuItems}
                    checked={item.checked}
                    keyValue={item.key}
                    dropdownValue={item.dropdownVal}
                    valueValue={item.value}
                    containerOffset={containerOffset}
                    index={currIndex}
                    handleUpdateParent={handleUpdateNewParent}
                    GetTokenPicker={GetTokenPicker}
                  />
                ) : (
                  <Group
                    key={`group ${currIndex}`}
                    groupMenuItems={groupMenuItems}
                    rowMenuItems={rowMenuItems}
                    containerOffset={containerOffset}
                    groupProps={{
                      type: 'group',
                      items: item.items,
                      selectedOption: item.selectedOption,
                      checked: item.checked,
                    }}
                    index={currIndex}
                    handleDeleteChild={() => handleDelete(currIndex)}
                    handleUpdateParent={handleUpdateNewParent}
                    GetTokenPicker={GetTokenPicker}
                  />
                );
              })}
              {
                <>
                  {groupProps.items.length === 0 && (
                    <Row
                      index={0}
                      rowMenuItems={rowMenuItems}
                      containerOffset={containerOffset}
                      GetTokenPicker={GetTokenPicker}
                      handleUpdateParent={handleUpdateNewParent}
                    />
                  )}
                  <AddSection
                    handleUpdateParent={handleUpdateNewParent}
                    index={groupProps.items.length + 1}
                    isEmpty={groupProps.items.length === 0}
                  />
                </>
              }
            </div>
          </>
        ) : (
          <GroupDropdown selectedOption={groupProps.selectedOption} onChange={handleSelectedOption} />
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
                overflowItems={moreGroupMenuItems}
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
