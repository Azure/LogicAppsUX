import { findChildNode } from '../../editor/base/utils/helper';
import { TokenType } from '../../editor/models/parameter';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand, NodeKey } from 'lexical';
import { $getRoot, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

export const UPDATE_TOKENPICKER_EXPRESSION: LexicalCommand<string> = createCommand();

interface TokenPickerHandlerProps {
  handleUpdateExpressionToken?: (s: string, n: NodeKey) => void;
}

export default function TokenPickerHandler({ handleUpdateExpressionToken }: TokenPickerHandlerProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<string>(
      UPDATE_TOKENPICKER_EXPRESSION,
      (payload: string) => {
        const node = findChildNode($getRoot(), payload, TokenType.FX);
        if (node?.token?.tokenType === TokenType.FX) {
          console.log(node?.token?.value);
          console.log(handleUpdateExpressionToken);
          handleUpdateExpressionToken?.(node?.token?.value ?? '', payload);
        } else {
          editor.focus();
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, handleUpdateExpressionToken]);
  return null;
}
