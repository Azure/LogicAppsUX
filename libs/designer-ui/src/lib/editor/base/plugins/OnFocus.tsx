import type { FocusTokenPickerProps } from '..';
import TokenPicker from './TokenPicker';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FOCUS_COMMAND, COMMAND_PRIORITY_NORMAL } from 'lexical';
import { useEffect } from 'react';

interface OnFocusProps {
  focused: boolean;
  command: () => void;
  tokenPicker?: FocusTokenPickerProps;
  addDictionaryItem?: AddDictionaryProps;
}

interface AddDictionaryProps {
  addItem: (index: number) => void;
  index: number;
}

export default function OnFocus({ command, focused, tokenPicker, addDictionaryItem }: OnFocusProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      FOCUS_COMMAND,
      () => {
        command();
        if (addDictionaryItem) {
          const { addItem, index } = addDictionaryItem;
          addItem(index);
        }
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor, command, addDictionaryItem]);

  return (
    <TokenPicker
      focused={focused}
      buttonClassName={tokenPicker?.buttonClassName}
      buttonHeight={tokenPicker?.buttonHeight}
      showTokenPicker={tokenPicker?.showTokenPicker}
    />
  );
}
