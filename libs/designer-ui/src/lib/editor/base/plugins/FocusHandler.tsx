import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { BLUR_COMMAND, CLICK_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical';
import { useEffect } from 'react';

interface FocusChangePluginProps {
  onFocus: () => void;
  onBlur: () => void;
}

export const FocusChangePlugin = ({ onFocus, onBlur }: FocusChangePluginProps) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        CLICK_COMMAND,
        () => {
          onFocus();
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        BLUR_COMMAND,
        () => {
          onBlur();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, onFocus, onBlur]);

  return null;
};
