import { Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components';
import type { DropdownMenuCustomNode } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/dropdownMenuCustomNode';
import type { DropdownMenuOption } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/dropdownMenuOption';
import type { TopLevelDropdownMenuItem } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/topLevelDropdownMenuItem';
import type React from 'react';
import { useState } from 'react';

export interface CustomMenuProps {
  item: TopLevelDropdownMenuItem;
}

export const CustomMenu: React.FC<CustomMenuProps> = ({ item }) => {
  const [openState, setOpenState] = useState(false);

  return (
    <div>
      {item.subMenuItems ? (
        <Menu>
          <MenuTrigger>
            <MenuItem
              icon={item?.icon}
              onClick={item?.onClick ? item.onClick : () => setOpenState(!openState)}
              data-automation-id={item?.dataAutomationId}
            >
              {item.text}
            </MenuItem>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {item.subMenuItems?.map((subItem: DropdownMenuOption) => {
                if (isDropdownMenuCustomNode(subItem)) {
                  return subItem.renderCustomComponent();
                }
                return (
                  <MenuItem
                    key={subItem.text}
                    aria-label={subItem.ariaLabel}
                    icon={subItem.icon}
                    onClick={subItem.onClick}
                    disabled={subItem.disabled}
                  >
                    {subItem.text}
                  </MenuItem>
                );
              })}
            </MenuList>
          </MenuPopover>
        </Menu>
      ) : (
        <MenuItem icon={item.icon} onClick={item.onClick}>
          {item.text}
        </MenuItem>
      )}
    </div>
  );
};

const isDropdownMenuCustomNode = (item: DropdownMenuOption): item is DropdownMenuCustomNode => {
  return (item as DropdownMenuCustomNode).renderCustomComponent !== undefined;
};
