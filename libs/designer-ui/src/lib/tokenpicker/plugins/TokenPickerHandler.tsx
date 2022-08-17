import { findChildNode } from '../../editor/base/utils/helper';
import { TokenType } from '../../editor/models/parameter';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand, NodeKey } from 'lexical';
import { $getRoot, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

export const CHANGE_TOKENPICKER_EXPRESSION: LexicalCommand<string> = createCommand();

interface TokenPickerHandlerProps {
  handleUpdateExpressionToken?: (s: string, n: NodeKey) => void;
}

export default function TokenPickerHandler({ handleUpdateExpressionToken }: TokenPickerHandlerProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<string>(
      CHANGE_TOKENPICKER_EXPRESSION,
      (payload: string) => {
        handleUpdateExpressionToken?.(findChildNode($getRoot(), payload, TokenType.FX)?.token?.description ?? '', payload);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, handleUpdateExpressionToken]);

  return null;
}
