import { css, useTheme } from '@fluentui/react';
import type { MutableRefObject, RefObject } from 'react';
import { createContext, useEffect, useMemo, useCallback, useState } from 'react';

type DropdownItemHTMLElement = HTMLButtonElement | HTMLInputElement;

interface DropdownItemsProps {
  children: React.ReactNode;
  dropDownRef: MutableRefObject<HTMLDivElement | null>;
  stopCloseOnClickSelf?: boolean;
  onClose: () => void;
}

export type DropDownContextType = {
  registerItem: (ref: RefObject<DropdownItemHTMLElement>) => void;
};

export const DropDownContext = createContext<DropDownContextType | null>(null);

export const DropDownItems = ({ children, dropDownRef, stopCloseOnClickSelf, onClose }: DropdownItemsProps) => {
  const { isInverted } = useTheme();
  const [items, setItems] = useState<RefObject<DropdownItemHTMLElement>[]>();
  const [highlightedItem, setHighlightedItem] = useState<RefObject<DropdownItemHTMLElement>>();

  // register item to end of list
  const registerItem = useCallback(
    (itemRef: RefObject<DropdownItemHTMLElement>) => {
      setItems((prev) => (prev ? [...prev, itemRef] : [itemRef]));
    },
    [setItems]
  );

  // keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!items) {
      return;
    }

    const key = event.key;

    if (['Escape', 'ArrowUp', 'ArrowDown', 'Tab'].includes(key)) {
      event.preventDefault();
    }

    if (key === 'Escape' || key === 'Tab') {
      onClose();
    } else if (key === 'ArrowUp') {
      setHighlightedItem((prev) => {
        if (!prev) {
          return items[0];
        }
        const index = items.indexOf(prev) - 1;
        return items[index === -1 ? items.length - 1 : index];
      });
    } else if (key === 'ArrowDown') {
      setHighlightedItem((prev) => {
        if (!prev) {
          return items[0];
        }
        return items[items.indexOf(prev) + 1];
      });
    }
  };

  const contextValue = useMemo(
    () => ({
      registerItem,
    }),
    [registerItem]
  );

  useEffect(() => {
    if (items && !highlightedItem) {
      setHighlightedItem(items[0]);
    }

    if (highlightedItem?.current) {
      highlightedItem.current.focus();
    }
  }, [items, highlightedItem]);

  return (
    <DropDownContext.Provider value={contextValue}>
      <div
        className={css('msla-html-editor-dropdown-items-container', isInverted && 'inverted')}
        ref={dropDownRef}
        onKeyDown={handleKeyDown}
        onClick={() => {
          if (stopCloseOnClickSelf) {
            return;
          }
          onClose();
        }}
        onBlur={(e) => {
          if (
            e.relatedTarget?.classList.contains('fontsize-item') ||
            e.relatedTarget?.classList.contains('fontfamily-item') ||
            e.relatedTarget?.classList.contains('fontcolor-item') ||
            e.relatedTarget?.classList.contains('default-color-buttons') ||
            e.target.classList.contains('blockcontrol-item') ||
            e.target.classList.contains('default-color-buttons')
          ) {
            return;
          }
          onClose();
        }}
      >
        {children}
      </div>
    </DropDownContext.Provider>
  );
};
