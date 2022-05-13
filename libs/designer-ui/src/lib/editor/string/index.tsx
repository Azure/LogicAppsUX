import AutoFocusPlugin from './plugins/AutoFocusPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import LexicalComposer from '@lexical/react/LexicalComposer';
import ContentEditable from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';
import LexicalRichTextPlugin from '@lexical/react/LexicalRichTextPlugin';
import { $getRoot, $getSelection } from 'lexical';
import { useIntl } from 'react-intl';

const defaultTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
};

const onChange = (editorState: { read: (arg0: () => void) => void }) => {
  editorState.read(() => {
    // Read the contents of the EditorState here.
    const root = $getRoot();
    const selection = $getSelection();
    console.log(root, selection);
  });
};
const onError = (error: any) => {
  console.error(error);
};
export const StringEditor = () => {
  const initialConfig = {
    defaultTheme,
    onError,
  };
  const intl = useIntl();
  const textPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter Some Text...',
    description: 'Label for placeholder',
  });
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="msla-string-editor-container">
        <LexicalRichTextPlugin
          contentEditable={<ContentEditable />}
          placeholder={<div className="editor-placeholder">{textPlaceholder}</div>}
        />
        <LexicalOnChangePlugin onChange={onChange} />
        <TreeViewPlugin />
        <AutoFocusPlugin />
        <HistoryPlugin />
      </div>
    </LexicalComposer>
  );
};
