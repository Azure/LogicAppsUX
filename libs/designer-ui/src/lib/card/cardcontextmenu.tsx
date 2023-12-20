import type { MenuOpenChangeData } from '@fluentui/react-components';
import { Menu, MenuPopover, MenuList } from '@fluentui/react-components';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useOnViewportChange } from 'reactflow';

export interface CardContextMenuProps {
  contextMenuLocation?: { x: number; y: number };
  menuItems: JSX.Element[];
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
}

export interface FUIReactMenuItem {
  key: string;
  text: string;
  subtext?: string;
  disabled?: boolean;
  icon?: JSX.Element;
  onClick?: (e: any) => void;
}

export const CardContextMenu: React.FC<CardContextMenuProps> = ({ contextMenuLocation, menuItems, open, title, setOpen }) => {
  const intl = useIntl();

  useOnViewportChange({
    onStart: useCallback(() => open && setOpen(false), [open, setOpen]),
  });

  const CARD_CONTEXT_MENU_ARIA_LABEL = intl.formatMessage(
    {
      defaultMessage: 'Context menu for {title} card',
      description: 'Accessibility label',
    },
    {
      title,
    }
  );

  const offset = contextMenuLocation ? { mainAxis: contextMenuLocation.y, crossAxis: contextMenuLocation.x } : undefined;
  const getBoundingClientRect = () => ({
    x: contextMenuLocation?.x ?? 0,
    y: contextMenuLocation?.y ?? 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  return (
    <Menu
      open={open}
      aria-label={CARD_CONTEXT_MENU_ARIA_LABEL}
      onOpenChange={(_e: any, data: MenuOpenChangeData) => setOpen(data.open)}
      positioning={{ target: { getBoundingClientRect }, offset }}
      closeOnScroll
    >
      <MenuPopover>
        <MenuList>{menuItems}</MenuList>
      </MenuPopover>
    </Menu>
  );
};
