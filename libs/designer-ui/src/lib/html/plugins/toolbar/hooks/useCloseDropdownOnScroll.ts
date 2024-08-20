import type { LexicalEditor } from 'lexical';
import { useEffect } from 'react';
import { CLOSE_DROPDOWN_COMMAND } from '../helper/Dropdown';

export const useCloseDropdownOnScroll = (activeEditor: LexicalEditor) => {
  useEffect(() => {
    function handleScroll() {
      activeEditor.dispatchCommand(CLOSE_DROPDOWN_COMMAND, undefined);
    }

    const scrollableContent = document.querySelector('.ms-Panel-scrollableContent');
    if (scrollableContent) {
      scrollableContent.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollableContent) {
        scrollableContent.removeEventListener('scroll', handleScroll);
      }
    };
  }, [activeEditor]);
};
