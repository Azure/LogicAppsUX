import LexicalComposer from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';
import LexicalPlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import { $getRoot, $getSelection } from 'lexical';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';

const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
};

// When the editor changes, you can get notified via the
// LexicalOnChangePlugin!
const onChange = (editorState: { read: (arg0: () => void) => void }) => {
  editorState.read(() => {
    // Read the contents of the EditorState here.
    const root = $getRoot();
    const selection = $getSelection();

    console.log(root, selection);
  });
};

// Lexical React plugins are React components, which makes them
// highly composable. Furthermore, you can lazy load plugins if
// desired, so you don't pay the cost for plugins until you
// actually use them.
const MyCustomAutoFocusPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Focus the editor when the effect fires!
    editor.focus();
  }, [editor]);

  return null;
};

const onError = (error: any) => {
  console.error(error);
};

export const StringEditor = () => {
  const initialConfig = {
    theme,
    onError,
  };
  const intl = useIntl();

  const textPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter Some Text...',
    description: 'Label for placeholder',
  });

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <LexicalPlainTextPlugin contentEditable={<LexicalContentEditable />} placeholder={<div>{textPlaceholder}</div>} />
      <LexicalOnChangePlugin onChange={onChange} />
      <HistoryPlugin />
      <MyCustomAutoFocusPlugin />
    </LexicalComposer>
  );
};
