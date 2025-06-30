import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { MenuOpenChangeData } from '@fluentui/react-components';
import { Menu, MenuPopover, MenuList, MenuItem } from '@fluentui/react-components';
import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';

import { bundleIcon, Delete24Filled, Delete24Regular } from '@fluentui/react-icons';
import { useOnViewportChange } from '@xyflow/react';
import { useIntl } from 'react-intl';

const DeleteIcon = bundleIcon(Delete24Filled, Delete24Regular);

export interface EdgeContextMenuProps {
  contextMenuLocation?: { x: number; y: number };
  open: boolean;
  setOpen: (open: boolean) => void;
  onDelete: () => void;
}

export interface FUIReactMenuItem {
  key: string;
  text: string;
  subtext?: string;
  disabled?: boolean;
  icon?: JSX.Element;
  onClick?: (e: any) => void;
}

export const useContextMenu = () => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuLocation, setContextMenuLocation] = useState({
    x: 0,
    y: 0,
  });

  const handleContextMenu: React.MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
    setContextMenuLocation({ x: e.clientX, y: e.clientY });
  };

  return {
    handle: handleContextMenu,
    isShowing: showContextMenu,
    setIsShowing: setShowContextMenu,
    location: contextMenuLocation,
    setLocation: setContextMenuLocation,
  };
};

export const EdgePathContextMenu: React.FC<EdgeContextMenuProps> = ({ contextMenuLocation, open, setOpen, onDelete }) => {
  const intl = useIntl();
  const readOnly = useReadOnly();

  useOnViewportChange({
    onStart: useCallback(() => open && setOpen(false), [open, setOpen]),
  });

  const onOpenChange = useCallback((_e: any, data: MenuOpenChangeData) => setOpen(data.open), [setOpen]);

  const positioning = useMemo(() => {
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
    return { target: { getBoundingClientRect }, offset };
  }, [contextMenuLocation]);

  const deleteText = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 'mleMRC',
    description: 'Text for delete edge in edge context menu',
  });

  return (
    <Menu open={open} onOpenChange={onOpenChange} positioning={positioning} closeOnScroll>
      <MenuPopover>
        <MenuList>
          <MenuItem key={'delete'} disabled={readOnly} icon={<DeleteIcon />} onClick={onDelete}>
            {deleteText}
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
