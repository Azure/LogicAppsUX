import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand } from 'lexical';
import { CLEAR_EDITOR_COMMAND, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

export const SINGLE_VALUE_SEGMENT: LexicalCommand<boolean> = createCommand();

export default function SingleValueSegment() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      SINGLE_VALUE_SEGMENT,
      () => {
        editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
