import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CLEAR_EDITOR_COMMAND } from 'lexical';
import { useIntl } from 'react-intl';

export default function ClearEditorPlugin() {
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const text = intl.formatMessage({
    defaultMessage: 'Clear',
    description: 'test',
  });
  return (
    <button
      title={'test'}
      onClick={() => {
        editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
        editor.focus();
      }}
    >
      {text}
    </button>
  );
}
