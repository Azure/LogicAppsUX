import { TokenPickerMode } from '../../../tokenpicker';
import { UPDATE_TOKENPICKER_EXPRESSION } from '../../../tokenpicker/plugins/TokenPickerHandler';
import { TokenType } from '../../models/parameter';
import { findChildNode } from '../utils/helper';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand } from 'lexical';
import { COMMAND_PRIORITY_EDITOR, $getRoot, createCommand } from 'lexical';
import { useEffect } from 'react';

export const OPEN_TOKEN_PICKER: LexicalCommand<string> = createCommand();

export interface OpenTokenPickerProps {
  openTokenPicker: (tokenPickerMode: TokenPickerMode) => void;
}

export default function OpenTokenPicker({ openTokenPicker }: OpenTokenPickerProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      OPEN_TOKEN_PICKER,
      (payload: string) => {
        const node = findChildNode($getRoot(), payload, TokenType.FX);
        if (node?.token?.tokenType === TokenType.FX) {
          openTokenPicker(TokenPickerMode.EXPRESSION);
          setTimeout(() => {
            editor.dispatchCommand(UPDATE_TOKENPICKER_EXPRESSION, payload);
          }, 50);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, openTokenPicker]);

  return null;
}
