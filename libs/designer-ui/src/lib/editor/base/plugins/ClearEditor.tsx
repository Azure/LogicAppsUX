import { ClearEditorPlugin as ClearEditorEnabled } from '@lexical/react/LexicalClearEditorPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CLEAR_EDITOR_COMMAND } from 'lexical';
import { useIntl } from 'react-intl';

export default function ClearEditor() {
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const text = intl.formatMessage({
    defaultMessage: 'Clear',
    description: 'Label to clear editor',
  });
  return (
    <button
      title={'clear editor'}
      onClick={() => {
        editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
        editor.focus();
      }}
    >
      {text}
      <ClearEditorEnabled />
    </button>
  );
}
