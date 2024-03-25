import { $isTokenNode, TokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand, NodeKey } from 'lexical';
import { $getNodeByKey, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

export const DELETE_TOKEN_NODE: LexicalCommand<NodeKey> = createCommand();

export default function DeleteTokenNode(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TokenNode])) {
      throw new Error('DeleteTokenNodePlugin: TokenNode not registered on editor');
    }

    return editor.registerCommand<NodeKey>(
      DELETE_TOKEN_NODE,
      (payload) => {
        const node = $getNodeByKey(payload);
        if ($isTokenNode(node)) {
          node.remove();
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
