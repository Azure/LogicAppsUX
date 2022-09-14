import { isDeleteKey, isEnterKey, isSpaceKey } from '../utils';
import type { MenuItemOption } from './types';
import { equals } from '@microsoft-logic-apps/utils';
import { useState } from 'react';

export const useCardContextMenu = () => {
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

export const useCardKeyboardInteraction = (onPrimaryClick: any, contextMenuOptions: MenuItemOption[]) => {
  // Prevent Enter and space bar keypresses from scrolling the page down when used to select a card.
  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = (e) => {
    if (isEnterKey(e) || isSpaceKey(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleKeyUp: React.KeyboardEventHandler<HTMLElement> = (e) => {
    if (isEnterKey(e) || isSpaceKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      onPrimaryClick?.();
    } else if (isDeleteKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      for (const contextMenuOption of contextMenuOptions) {
        if (equals(contextMenuOption.key, 'delete') && !contextMenuOption.disabled) {
          contextMenuOption.onClick?.(e);
        }
      }
    }
  };

  return {
    keyDown: handleKeyDown,
    keyUp: handleKeyUp,
  };
};
