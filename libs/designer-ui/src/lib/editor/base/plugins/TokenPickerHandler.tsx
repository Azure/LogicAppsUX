import { TokenType } from '../../models/parameter';
import { findChildNode } from '../utils/helper';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand } from 'lexical';
import { $getRoot, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

export const CHANGE_TOKENPICKER_EXPRESSION: LexicalCommand<string> = createCommand();

interface TokenPickerHandlerProps {
  handleUpdateExpressionToken?: (s: string) => void;
}

export default function TokenPickerHandler({ handleUpdateExpressionToken }: TokenPickerHandlerProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<string>(
      CHANGE_TOKENPICKER_EXPRESSION,
      (payload: string) => {
        handleUpdateExpressionToken?.(findChildNode($getRoot(), payload, TokenType.FX)?.token?.description ?? '');
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, handleUpdateExpressionToken]);

  return null;
}
