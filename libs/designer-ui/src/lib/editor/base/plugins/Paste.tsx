import type { ValueSegment } from '../../models/parameter';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_EDITOR, PASTE_COMMAND } from 'lexical';
import { useEffect } from 'react';

interface FocusChangePluginProps {
  tokens: Record<string, ValueSegment>;
}

export const PastePlugin = ({ tokens }: FocusChangePluginProps) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    console.log('here');
    return editor.registerCommand(
      PASTE_COMMAND,
      (e: ClipboardEvent) => {
        e.preventDefault();
        console.log(e);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);
  return <></>;
};
