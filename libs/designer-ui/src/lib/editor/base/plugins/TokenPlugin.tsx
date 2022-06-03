import { $createTokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalEditor } from 'lexical';
import { TextNode } from 'lexical';
import { useEffect } from 'react';

function tokenTransform(node: TextNode) {
  const textContent = node.getTextContent();
  if (textContent === 'token') {
    node.replace($createTokenNode('msla-token-node', 'Token'));
  }
}

function useTokens(editor: LexicalEditor) {
  useEffect(() => {
    const removeTransform = editor.registerNodeTransform(TextNode, tokenTransform);
    return () => {
      removeTransform();
    };
  }, [editor]);
}

export default function TokenPlugin() {
  const [editor] = useLexicalComposerContext();
  useTokens(editor);
  return null;
}
