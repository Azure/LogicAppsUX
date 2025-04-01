import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand, NodeKey } from 'lexical';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import type { OPEN_TOKEN_PICKER_PAYLOAD } from '../../editor/base/plugins/OpenTokenPicker';
import { useEffect } from 'react';

export const INITIALIZE_TOKENPICKER_EXPRESSION: LexicalCommand<OPEN_TOKEN_PICKER_PAYLOAD> = createCommand();

interface TokenPickerHandlerProps {
  handleInitializeExpression?: (s: string, n: NodeKey) => void;
}

export default function TokenPickerExpressionHandler({ handleInitializeExpression }: TokenPickerHandlerProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<OPEN_TOKEN_PICKER_PAYLOAD>(
      INITIALIZE_TOKENPICKER_EXPRESSION,
      (payload: OPEN_TOKEN_PICKER_PAYLOAD) => {
        const { token, nodeKey } = payload;
        if (token?.value) {
          handleInitializeExpression?.(token.value, nodeKey);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, handleInitializeExpression]);
  return null;
}
