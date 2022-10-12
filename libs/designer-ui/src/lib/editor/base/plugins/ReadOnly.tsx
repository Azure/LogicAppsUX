import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';

interface ReadOnlyProps {
  readonly: boolean;
}

export function ReadOnly({ readonly }: ReadOnlyProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!readonly);
  }, [editor, readonly]);

  return null;
}
