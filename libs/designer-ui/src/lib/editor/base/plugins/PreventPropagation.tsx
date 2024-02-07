import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_EDITOR, KEY_DOWN_COMMAND } from 'lexical';

export const PreventPropagationPlugin = () => {
  const [editor] = useLexicalComposerContext();
  editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event: KeyboardEvent) => {
      event.stopPropagation();
      return false;
    },
    COMMAND_PRIORITY_EDITOR
  );
  return null;
};
