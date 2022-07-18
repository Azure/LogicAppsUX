import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { BLUR_COMMAND, COMMAND_PRIORITY_NORMAL } from 'lexical';
import { useEffect } from 'react';

export default function OnBlur({ command }: { command: () => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      BLUR_COMMAND,
      () => {
        command();
        return true;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor, command]);

  return null;
}
