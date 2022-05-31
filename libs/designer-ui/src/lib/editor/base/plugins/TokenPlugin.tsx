// TODO 14556566: Adding Tokens to Base Editor
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

export default function ClearEditorPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // test
  }, [editor]);
  return null;
}
