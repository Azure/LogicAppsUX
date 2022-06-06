import { $createTokenNode, TokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { createCommand, TextNode } from 'lexical';
import { useCallback, useEffect } from 'react';

// /* NOTE(wue): Token data */
// [{literal:data}, {token: data}, {literal:data}.{token:data},{token:data}]

export const INSERT_SAMPLE_LINK_COMMAND = createCommand();
export default function DummyPlugin() {
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
        const replacementNode = $createTokenNode(nodeToReplace.getTextContent());
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
