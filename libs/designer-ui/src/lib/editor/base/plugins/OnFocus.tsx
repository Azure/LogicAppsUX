import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { FOCUS_COMMAND, COMMAND_PRIORITY_NORMAL } from 'lexical';
import { useEffect } from 'react';

interface OnFocusProps {
  command: () => void;
}

export default function OnFocus({ command }: OnFocusProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      FOCUS_COMMAND,
      () => {
        command();
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor, command]);

  return null;
}
