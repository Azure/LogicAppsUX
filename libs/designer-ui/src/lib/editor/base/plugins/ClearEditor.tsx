import { ClearEditorPlugin as ClearEditorEnabled } from '@lexical/react/LexicalClearEditorPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CLEAR_EDITOR_COMMAND } from 'lexical';
import { useIntl } from 'react-intl';

interface ClearEditorProps {
  showButton: boolean;
}
export default function ClearEditor({ showButton }: ClearEditorProps): JSX.Element {
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const buttonText = intl.formatMessage({
    defaultMessage: 'Clear',
    id: 'WGwH45',
    description: 'Label to clear editor',
  });

  const buttonLabel = intl.formatMessage({
    defaultMessage: 'Clear Editor',
    id: 'YEHutH',
    description: 'Label to clear editor',
  });

  return (
    <>
      {showButton ? (
        <button
          title={buttonLabel}
          onClick={() => {
            editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
            editor.focus();
          }}
        >
          {buttonText}
        </button>
      ) : null}
      <ClearEditorEnabled />
    </>
  );
}
