import { $isTokenNode, TokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { ElementNode, LexicalCommand } from 'lexical';
import { $getRoot, $isElementNode, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

interface UpdateTokenNodesPayload {
  key: string; // normalized key to identify the token node
  // the rest is the update payload
  description?: string;
  type?: string;
  title?: string;
}

export const UPDATE_TOKEN_NODES: LexicalCommand<UpdateTokenNodesPayload> = createCommand();

// Recursively traverse the Lexical tree to find all token nodes.

const updateTokenNodes = (node: ElementNode, payload: UpdateTokenNodesPayload) => {
  const { key, description, type, title } = payload;
  node.getChildren().forEach((child) => {
    if ($isElementNode(child)) {
      updateTokenNodes(child, payload);
    } else if ($isTokenNode(child) && child.__data.token?.key === key) {
      child.updateToken({ description, type, title });
    }
  });
};

export default function UpdateTokenNodesPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TokenNode])) {
      throw new Error('UpdateTokenNodesPlugin: TokenNode not registered on editor');
    }

    return editor.registerCommand<UpdateTokenNodesPayload>(
      UPDATE_TOKEN_NODES,
      (payload) => {
        editor.update(() => {
          const root = $getRoot();
          updateTokenNodes(root, payload);
        });

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
