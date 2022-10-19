import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useUpdateEffect } from '@react-hookz/web';

interface ReadOnlyProps {
  readonly: boolean;
}

export function ReadOnly({ readonly }: ReadOnlyProps) {
  const [editor] = useLexicalComposerContext();

  useUpdateEffect(() => {
    editor.setEditable(!readonly);
  }, [editor, readonly]);

  return null;
}
