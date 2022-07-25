import { TokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand } from 'lexical';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

export const DELETE_TOKEN_NODE: LexicalCommand<TokenNode | null> = createCommand();

export default function DeleteTokenNode(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TokenNode])) {
      throw new Error('DeleteTokenNodePlugin: TokenNode not registered on editor');
    }

    return editor.registerCommand<TokenNode | null>(
      DELETE_TOKEN_NODE,
      (payload) => {
        payload?.remove();
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
