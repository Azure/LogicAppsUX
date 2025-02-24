import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { $getRoot, $createParagraphNode, $isTextNode } from 'lexical';
import { $createPasswordNode, $isPasswordNode } from '../nodes/passwordNode';

export function PasswordMaskPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.update(() => {
        const root = $getRoot();
        const textNode = root.getFirstChild();

        console.log('textNode', textNode);

        if (textNode && $isTextNode(textNode) && !$isPasswordNode(textNode)) {
          const realText = textNode.getTextContent();
          const passwordNode = $createPasswordNode(realText);

          root.clear();
          root.append($createParagraphNode().append(passwordNode));
        }
      });
    });
  }, [editor]);

  return null;
}
