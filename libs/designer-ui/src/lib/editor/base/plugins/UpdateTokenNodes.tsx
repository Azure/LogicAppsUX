import { $isTokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { ElementNode } from 'lexical';
import { $getRoot, $isElementNode } from 'lexical';
import { useEffect } from 'react';

interface UpdateTokenNodesPayload {
  key: string; // normalized key to identify the token node AgentParameter.{name}
  // the rest is the update payload
  description?: string;
  type?: string;
  title?: string;
}

export const UPDATE_ALL_EDITORS_EVENT = 'update-all-editors';

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
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ payload: UpdateTokenNodesPayload }>;
      const { payload } = customEvent.detail; // Extract payload

      editor.update(() => {
        const root = $getRoot();
        updateTokenNodes(root, payload);
      });
    };

    window.addEventListener(UPDATE_ALL_EDITORS_EVENT, handleUpdate);

    return () => {
      window.removeEventListener(UPDATE_ALL_EDITORS_EVENT, handleUpdate);
    };
  }, [editor]);

  return null;
}
