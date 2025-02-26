import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import type { LexicalNode } from 'lexical';
import { $getRoot, $getSelection, $isElementNode, $isRangeSelection, $isTextNode, TextNode } from 'lexical';
import { $isPasswordNode, $createPasswordNode, PasswordNode } from '../nodes/passwordNode';

export function PasswordMaskPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Mutation Listener: Detects newly created or updated text nodes
    const unregisterMutationListener = editor.registerMutationListener(TextNode, (mutations) => {
      editor.update(() => {
        mutations.forEach((mutation, key) => {
          if (mutation === 'created' || mutation === 'updated') {
            const node = editor.getEditorState()._nodeMap.get(key) as LexicalNode | null;
            if (!node || !$isTextNode(node) || $isPasswordNode(node)) {
              return;
            }

            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
              return;
            }

            const text = node.getTextContent();
            const textToAdd = text.replace(/•/g, '');

            if (!textToAdd) {
              return;
            }
            let passwordNode: any = node.getPreviousSibling();
            if (!passwordNode || !$isPasswordNode(passwordNode)) {
              passwordNode = node.getNextSibling();
            }

            // when we paste text it comes in as a textNode, which could be in the middle of a password node
            // we remove the pasted text node and then re-add it to the password node based on the selection
            if ($isPasswordNode(passwordNode)) {
              let newText = '';
              const root = $getRoot();
              root.getChildren().forEach((node) => {
                if ($isElementNode(node)) {
                  node.getChildren().forEach((child) => {
                    if (!$isPasswordNode(child)) {
                      newText = child.getTextContent().replace(/•/g, '');
                      child.remove();
                    }
                  });
                }
              });
              console.log(`Updating password node by insertion: ${textToAdd}`);
              const existingText = passwordNode.getRealText();
              const startOffset = selection.anchor.offset;
              const newSelectionPosition = startOffset + newText.length;
              const updatedText = existingText.substring(0, startOffset) + newText + existingText.substring(startOffset);
              passwordNode.setPassword(updatedText);
              const newSelection = $getSelection();
              if ($isRangeSelection(newSelection)) {
                newSelection.anchor.set(passwordNode.__key, newSelectionPosition, 'text');
                newSelection.focus.set(passwordNode.__key, newSelectionPosition, 'text');
              }
            } else {
              // No existing password node found, create a new one
              const newPasswordNode = $createPasswordNode(textToAdd);
              newPasswordNode.setPassword(textToAdd);
              node.replace(newPasswordNode);
            }
          }
        });
      });
    });

    // Node Transform: Detects updates inside existing password nodes
    const unregisterTransform = editor.registerNodeTransform(PasswordNode, (node) => {
      editor.update(() => {
        const existingText = node.getRealText();
        const text = node.getTextContent();
        const textToAdd = text.replace(/•/g, ''); // Remove masking dots to track real input

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        if (textToAdd) {
          console.log(`Updating password node: ${textToAdd}`);

          const startOffset = selection.anchor.offset - 1;
          const updatedText = existingText.substring(0, startOffset) + textToAdd + existingText.substring(startOffset);
          node.setPassword(updatedText);
        }
      });
    });

    return () => {
      unregisterMutationListener();
      unregisterTransform();
    };
  }, [editor]);

  return null;
}
