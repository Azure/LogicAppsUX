import { isDeleteKey, isEnterKey, isSpaceKey } from '../utils';
import { equals } from '@microsoft/logic-apps-shared';
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

export const useCardKeyboardInteraction = (onPrimaryClick?: () => void, onDeleteClick?: () => void, onCopyClick?: () => void) => {
  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = (e) => {
    if (isEnterKey(e) || isSpaceKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      onPrimaryClick?.();
    } else if (isDeleteKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      onDeleteClick?.();
    } else if (equals(e.key, 'c', true) && e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      onCopyClick?.();
    }
  };

  const handleKeyUp: React.KeyboardEventHandler<HTMLElement> = (_e) => {
    // Nothing for now, may need to add key events in the future.
  };

  return {
    keyDown: handleKeyDown,
    keyUp: handleKeyUp,
  };
};
