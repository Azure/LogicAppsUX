import { MenuItem, MenuList, Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import type { DropdownMenuCustomNode } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/dropdownMenuCustomNode';
import type { DropdownMenuOption } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/dropdownMenuOption';
import type { TopLevelDropdownMenuItem } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/topLevelDropdownMenuItem';
import React, { useState } from 'react';

export interface CustomMenuProps {
  item: TopLevelDropdownMenuItem; 
}

export const CustomMenu: React.FC<CustomMenuProps> = ({item}) => {
  const [openState, setOpenState] = useState(false);

  return (
    <div>
      {item.subMenuItems ? (
        <Popover
          open={openState}
          positioning="after"
          closeOnScroll={true}
          withArrow
          mouseLeaveDelay={500}
          onOpenChange={(e, { open }) => setOpenState(open)}
        >
          <PopoverTrigger>
            <MenuItem icon={item.icon} onClick={() => setOpenState(!openState)}>
              {item.text}
            </MenuItem>
          </PopoverTrigger>
          <PopoverSurface>
            <MenuList>
              {item.subMenuItems?.map((subItem: DropdownMenuOption, subindex: number) => {
                if (isDropdownMenuCustomNode(subItem)) {
                  return (
                    <div key={subindex}> 
                      {subItem.renderCustomComponent()}
                    </div>)
                } else {
                    return (
                      <MenuItem
                        key={subindex} 
                        aria-label={subItem?.ariaLabel}
                        icon={subItem?.icon}
                        onClick={subItem?.onClick}
                      >
                        {subItem.text}
                      </MenuItem>
                    );
                }
              })}
            </MenuList>
          </PopoverSurface>
        </Popover>
      ) : (
        <MenuItem icon={item.icon} onClick={() => item.onClick}>
          {item.text}
        </MenuItem>
      )}
    </div>
  );
};

const isDropdownMenuCustomNode = (item: DropdownMenuOption): item is DropdownMenuCustomNode => {
  return (item as DropdownMenuCustomNode).renderCustomComponent !== undefined;
};