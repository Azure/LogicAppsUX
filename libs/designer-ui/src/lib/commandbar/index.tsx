import type React from 'react';
import {
  Badge,
  Button,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuSplitGroup,
  MenuTrigger,
  Overflow,
  OverflowItem,
  Spinner,
  SplitButton,
  ToolbarDivider,
  Tooltip,
  useIsOverflowGroupVisible,
  useIsOverflowItemVisible,
  useOverflowMenu,
} from '@fluentui/react-components';
import { MoreHorizontal20Filled } from '@fluentui/react-icons';
import './commandbar.less';

import { RovingTabIndexProvider, useRovingTabIndex, useFocusEffect } from 'react-roving-tabindex';
import { useRef } from 'react';

export interface CommandBarItem {
  id: string;
  groupId?: string;
  text: string;
  icon: JSX.Element;
  ariaLabel?: string;
  tooltip?: JSX.Element;
  loading?: boolean;
  visible?: boolean;
  disabled?: boolean;
  isError?: boolean;
  onClick?: () => void;
  subItems?: CommandBarItem[];
}

export interface CommandBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: CommandBarItem[];
  isDarkMode?: boolean;
}

export const CommandBar = ({ items, isDarkMode, ...props }: CommandBarProps) => {
  const visibleItems = items.filter((item) => item.visible !== false);

  return (
    <RovingTabIndexProvider>
      <Overflow padding={90}>
        <div
          className="msla-command-bar"
          style={{ borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}` }}
          role={'toolbar'}
          {...props}
        >
          {visibleItems.map((item, index) => (
            <ToolbarButton key={item.id} index={index} item={item} visibleItems={visibleItems} />
          ))}
          <OverflowMenu items={visibleItems} />
        </div>
      </Overflow>
    </RovingTabIndexProvider>
  );
};

const ToolbarButton = (props: { item: CommandBarItem; index: number; visibleItems: CommandBarItem[] }) => {
  const { item, index, visibleItems } = props;

  const { id, groupId = 'default', loading, text, icon, ariaLabel, onClick, tooltip, disabled, isError, subItems } = item;

  // The ref of the input to be controlled.
  const ref = useRef<HTMLButtonElement>(null);

  // handleKeyDown and handleClick are stable for the lifetime of the component:
  const [tabIndexRoving, focused, handleKeyDownRoving, handleClickRoving] = useRovingTabIndex(
    ref, // Don't change the value of this ref.
    disabled ?? false // But change this as you like throughout the lifetime of the component.
  );

  // Use some mechanism to set focus on the button if it gets focus.
  // In this case I use the included useFocusEffect hook:
  useFocusEffect(focused, ref);

  const buttonContent = (
    <>
      {text}
      {isError && <Badge size="extra-small" color="danger" className="msla-command-bar-error-badge" />}
    </>
  );

  const buttonProps: any = {
    ref,
    overflowId: id,
    overflowGroupId: groupId,
    className: 'msla-command-bar-button',
    icon: loading ? <Spinner size="extra-tiny" /> : icon,
    ariaLabel: ariaLabel ?? text,
    appearance: 'subtle',
    disabled,
    onClick: () => {
      handleClickRoving();
      onClick?.();
    },
    onKeyDown: handleKeyDownRoving,
    tabIndex: tabIndexRoving,
  };

  const toolbarButton = (
    <OverflowItem id={id} groupId={groupId}>
      <Button {...buttonProps}>{buttonContent}</Button>
    </OverflowItem>
  );

  const menuButtonWithMenu = (
    <Menu>
      {onClick ? (
        <MenuTrigger disableButtonEnhancement>
          {(triggerProps) => (
            <OverflowItem id={id} groupId={groupId}>
              <SplitButton primaryActionButton={buttonProps} menuButton={triggerProps} appearance="subtle" disabled={buttonProps.disabled}>
                {buttonContent}
              </SplitButton>
            </OverflowItem>
          )}
        </MenuTrigger>
      ) : (
        <MenuTrigger disableButtonEnhancement>
          <OverflowItem id={id} groupId={groupId}>
            <MenuButton {...buttonProps}>{buttonContent}</MenuButton>
          </OverflowItem>
        </MenuTrigger>
      )}
      <MenuPopover>
        <MenuList>
          {(subItems ?? []).map((subItem) => (
            <MenuItem key={subItem.id} icon={subItem.icon} aria-label={subItem.text} onClick={subItem.onClick} disabled={subItem.disabled}>
              {subItem.text}
            </MenuItem>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  const button = subItems ? menuButtonWithMenu : toolbarButton;

  const divider = visibleItems?.[index + 1] && (visibleItems[index + 1].groupId ?? 'default') !== groupId && (
    <ToolbarOverflowDivider groupId={groupId} />
  );

  const content = tooltip ? (
    <Tooltip relationship={'description'} content={tooltip} withArrow showDelay={0}>
      {button}
    </Tooltip>
  ) : (
    button
  );

  return (
    <>
      {content}
      {divider}
    </>
  );
};

const ToolbarOverflowMenuItem = (props: { item: CommandBarItem }) => {
  const { id, text, icon, onClick, disabled, subItems } = props.item;
  const isVisible = useIsOverflowItemVisible(id);

  if (isVisible) {
    return null;
  }

  const buttonContent = (
    <MenuItem key={`overflow-${id}`} icon={icon} aria-label={text} onClick={onClick} disabled={disabled}>
      {text}
    </MenuItem>
  );

  return subItems ? (
    <Menu>
      {onClick ? (
        <MenuSplitGroup>
          {buttonContent}
          <MenuTrigger disableButtonEnhancement>
            <MenuItem />
          </MenuTrigger>
        </MenuSplitGroup>
      ) : (
        <MenuTrigger disableButtonEnhancement>{buttonContent}</MenuTrigger>
      )}
      <MenuPopover>
        <MenuList>
          {subItems.map((subItem) => (
            <ToolbarOverflowMenuItem key={subItem.id} item={subItem} />
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  ) : (
    buttonContent
  );
};

const OverflowMenu = ({ items }: { items: CommandBarItem[] }) => {
  const { ref, isOverflowing } = useOverflowMenu<HTMLButtonElement>();

  if (!isOverflowing) {
    return null;
  }

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <MenuButton ref={ref} icon={<MoreHorizontal20Filled />} appearance="subtle" />
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          {items.map((item, index) => (
            <>
              <ToolbarOverflowMenuItem key={item.id} item={item} />
              {items?.[index + 1] && items[index + 1]?.groupId !== item.groupId && (
                <ToolbarMenuOverflowDivider groupId={item.groupId ?? 'default'} />
              )}
            </>
          ))}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};

const ToolbarOverflowDivider = ({ groupId }: { groupId: string }) => {
  const isGroupVisible = useIsOverflowGroupVisible(groupId);
  if (isGroupVisible === 'hidden') {
    return null;
  }
  return <ToolbarDivider />;
};

const ToolbarMenuOverflowDivider = ({ groupId }: { groupId: string }) => {
  const isGroupVisible = useIsOverflowGroupVisible(groupId);
  if (isGroupVisible === 'visible') {
    return null;
  }
  return <MenuDivider />;
};
