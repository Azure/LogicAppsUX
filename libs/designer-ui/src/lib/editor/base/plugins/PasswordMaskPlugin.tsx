import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState } from 'react';
import type { LexicalNode, RangeSelection } from 'lexical';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  SELECTION_CHANGE_COMMAND,
  TextNode,
} from 'lexical';
import { $isPasswordNode, $createPasswordNode, PasswordNode } from '../nodes/passwordNode';

export function PasswordMaskPlugin() {
  const [editor] = useLexicalComposerContext();
  const [selection, setSelection] = useState<RangeSelection | null>(null);

  useEffect(() => {
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        setSelection(selection);
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );

    // Mutation Listener: Detects newly created or updated text nodes
    const unregisterMutationListener = editor.registerMutationListener(TextNode, (mutations) => {
      editor.update(() => {
        mutations.forEach((mutation, key) => {
          console.log(mutation);
          if (mutation === 'created' || mutation === 'updated') {
            const node = editor.getEditorState()._nodeMap.get(key) as LexicalNode | null;
            if (!node || !$isTextNode(node) || $isPasswordNode(node)) {
              return;
            }

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
                      // get the new text and remove the text node (will be re-added to the password node)
                      newText = child.getTextContent().replace(/•/g, '');
                      child.remove();
                    }
                  });
                }
              });

              console.log(`Updating password node by insertion: ${textToAdd}`);
              const existingText = passwordNode.getRealText();

              const anchorOffset = selection.anchor.offset;
              const focusOffset = selection.focus.offset;

              const finalText =
                existingText.substring(0, Math.min(anchorOffset, focusOffset)) +
                newText +
                existingText.substring(Math.max(anchorOffset, focusOffset));

              passwordNode.setPassword(finalText);

              const newSelectionPosition = Math.min(anchorOffset, focusOffset) + newText.length;
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

        // this is the selection used after the transform
        const postSelection = $getSelection();
        if (!selection || !$isRangeSelection(postSelection) || !$isRangeSelection(selection)) {
          return;
        }
        const anchorOffset = selection.anchor.offset;
        const focusOffset = selection.focus.offset;
        if (textToAdd) {
          // text is being removed
          if (anchorOffset !== focusOffset) {
            const updatedText =
              existingText.substring(0, Math.min(anchorOffset, focusOffset)) +
              textToAdd +
              existingText.substring(Math.max(anchorOffset, focusOffset));
            node.setPassword(updatedText);
            setSelection(postSelection);
          } else {
            const startOffset = postSelection.anchor.offset - 1;
            const updatedText = existingText.substring(0, startOffset) + textToAdd + existingText.substring(startOffset);
            node.setPassword(updatedText);
          }
        }
      });
    });

    return () => {
      unregisterMutationListener();
      unregisterTransform();
    };
  }, [editor, selection]);

  return null;
}
