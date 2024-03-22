import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand } from 'lexical';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

interface CloseTokenPickerPaylaod {
  focusEditorAfter?: boolean;
}
export const CLOSE_TOKENPICKER: LexicalCommand<CloseTokenPickerPaylaod> = createCommand();

export interface CloseTokenPickerProps {
  closeTokenPicker: () => void;
}

export default function CloseTokenPicker({ closeTokenPicker }: CloseTokenPickerProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      CLOSE_TOKENPICKER,
      (payload) => {
        closeTokenPicker();
        if (payload.focusEditorAfter) {
          editor.focus();
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, closeTokenPicker]);

  return null;
}
