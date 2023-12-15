import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $moveCharacter, $shouldOverrideDefaultCharacterSelection } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isDecoratorNode,
  $isNodeSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
} from 'lexical';
import { useEffect } from 'react';

function $isTargetWithinDecorator(target: HTMLElement): boolean {
  const node = $getNearestNodeFromDOMNode(target);
  return $isDecoratorNode(node);
}

/*  There is a known bug in the lexical-plain-text-plugin where the arrow keys
 *  get stuck when navigating with decorator nodes. This causes an accessibility
 *  issue where users cannot navigate outside of the decorator node.
 *  This plugin is a temporary workaround until the bug is fixed.
 */
export function ArrowNavigation() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeListener = mergeRegister(
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_LEFT_COMMAND,
        (event) => {
          const selection = $getSelection();
          if ($isNodeSelection(selection)) {
            // If selection is on a node, let's try and move selection
            // back to being a range selection.
            const nodes = selection.getNodes();
            if (nodes.length > 0) {
              event.preventDefault();
              nodes[0].selectPrevious();
              return true;
            }
          }
          if (!$isRangeSelection(selection)) {
            return false;
          }
          if ($shouldOverrideDefaultCharacterSelection(selection, true)) {
            const isHoldingShift = event.shiftKey;
            event.preventDefault();
            $moveCharacter(selection, isHoldingShift, true);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_RIGHT_COMMAND,
        (event) => {
          const selection = $getSelection();
          if ($isNodeSelection(selection) && !$isTargetWithinDecorator(event.target as HTMLElement)) {
            // If selection is on a node, let's try and move selection
            // back to being a range selection.
            const nodes = selection.getNodes();
            if (nodes.length > 0) {
              event.preventDefault();
              nodes[0].selectNext(0, 0);
              return true;
            }
          }
          if (!$isRangeSelection(selection)) {
            return false;
          }
          const isHoldingShift = event.shiftKey;
          if ($shouldOverrideDefaultCharacterSelection(selection, false)) {
            event.preventDefault();
            $moveCharacter(selection, isHoldingShift, false);
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
    return removeListener;
  }, [editor]);

  return null;
}
