import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { KEY_TAB_COMMAND } from 'lexical';
import { useEffect } from 'react';

export default function IgnoreTab() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.registerCommand(
      KEY_TAB_COMMAND,
      (_payload: any) => {
        editor.blur();
        return true;
      },
      3
    );
    const unregisterListener = editor.registerUpdateListener(() => {
      // An update has occurred!
    });
    return () => {
      unregisterListener();
    };
  }, [editor]);
  return null;
}
