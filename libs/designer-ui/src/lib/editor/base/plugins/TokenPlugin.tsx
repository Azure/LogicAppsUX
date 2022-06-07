import { $createTokenNode, TokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TextNode } from 'lexical';
import { useCallback, useEffect } from 'react';

export default function TokenPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([TokenNode])) {
      throw new Error('TokenPlugin: Register the TokenNode on editor');
    }
  }, [editor]);

  const getTokenMatch = useCallback((node: TextNode) => {
    const text = node.getTextContent();
    console.log(text);
    if (text === 'token') {
      return {
        start: 0,
        end: 5,
      };
    }
    return null;
  }, []);

  useEffect(() => {
    /* NOTE(eric): Eventually we'd want to support replacing nodes */
    return editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
      let match = getTokenMatch(textNode);
      let currentNode = textNode;
      while (match !== null) {
        let nodeToReplace;
        currentNode.markDirty();
        if (match?.start === 0) {
          [nodeToReplace, currentNode] = currentNode.splitText(match.end);
        } else {
          [, nodeToReplace, currentNode] = currentNode.splitText(match.start, match.end);
        }
        const replacementNode = $createTokenNode('test-icon', 'test');
        nodeToReplace.replace(replacementNode);
        if (!currentNode) {
          replacementNode.selectNext();
          console.log(replacementNode);
          return;
        }
        match = getTokenMatch(currentNode);
        currentNode.select(0, 0);
      }
    });
  }, [editor, getTokenMatch]);

  return null;
}
