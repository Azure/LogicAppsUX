import { ClearEditorPlugin as ClearEditorEnabled } from '@lexical/react/LexicalClearEditorPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CLEAR_EDITOR_COMMAND } from 'lexical';
import { useIntl } from 'react-intl';

interface ClearEditorProps {
  showButton: boolean;
}
export default function ClearEditor({ showButton }: ClearEditorProps) {
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const text = intl.formatMessage({
    defaultMessage: 'Clear',
    description: 'Label to clear editor',
  });
  return (
    <>
      {showButton ? (
        <button
          title={'Clear Editor'}
          onClick={() => {
            editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
            editor.focus();
          }}
        >
          {text}
          <ClearEditorEnabled />
        </button>
      ) : (
        <ClearEditorEnabled />
      )}
    </>
  );
}
