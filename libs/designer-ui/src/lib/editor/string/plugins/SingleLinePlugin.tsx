import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CLEAR_EDITOR_COMMAND, KEY_ENTER_COMMAND } from 'lexical';
import { useEffect } from 'react';

export default function SingleLinePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      (payload: any) => {
        const event: KeyboardEvent = payload;
        // if (event.shiftKey) {
        //   return true;
        // } else {
        //   event.preventDefault();
        // }
        event.preventDefault();
        return true;
      },
      3
    );
    const unregisterListener = editor.registerUpdateListener(({ editorState }) => {
      // An update has occurred!
    });
    return () => {
      unregisterListener();
    };
  }, [editor]);
  return <> </>;
}
