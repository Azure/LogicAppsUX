import { TokenPickerMode } from '../../../tokenpicker';
import { UPDATE_TOKENPICKER_EXPRESSION } from '../../../tokenpicker/plugins/TokenPickerHandler';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand } from 'lexical';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

export const OPEN_TOKEN_PICKER: LexicalCommand<string> = createCommand();

interface OpenTokenPickerProps {
  openTokenPicker: (tokenPickerMode: TokenPickerMode) => void;
}

export default function OpenTokenPicker({ openTokenPicker }: OpenTokenPickerProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      OPEN_TOKEN_PICKER,
      (payload: string) => {
        openTokenPicker(TokenPickerMode.EXPRESSION);
        setTimeout(() => {
          editor.dispatchCommand(UPDATE_TOKENPICKER_EXPRESSION, payload);
        }, 50);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, openTokenPicker]);

  return null;
}
