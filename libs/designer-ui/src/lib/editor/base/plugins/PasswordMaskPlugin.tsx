import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { $getRoot, $getSelection, $isElementNode, $isRangeSelection } from 'lexical';
import { $isPasswordNode, $createPasswordNode } from '../nodes/passwordNode';

export function PasswordMaskPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerTextContentListener(() => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        const root = $getRoot();
        root.getChildren().forEach((node) => {
          if ($isElementNode(node)) {
            node.getChildren().forEach((child) => {
              if ($isPasswordNode(child)) {
                const realText = child.getRealText();
                const text = child.getTextContent();
                const removedText = text.replace(/•/g, '');
                console.log(text);
                const updatedText = realText + removedText;
                child.setPassword(text, updatedText);
              } else {
                const text = child.getTextContent();
                const passwordNode = $createPasswordNode(text);
                passwordNode.setPassword(text, text); // Ensures the original value is stored
                child.replace(passwordNode);
              }
            });
          }
        });
      });
    });
  }, [editor]);

  return null;
}
