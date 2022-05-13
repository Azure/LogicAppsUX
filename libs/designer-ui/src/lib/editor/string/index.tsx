import AutoFocusPlugin from './plugins/AutoFocusPlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import LexicalComposer from '@lexical/react/LexicalComposer';
import ContentEditable from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';
import LexicalRichTextPlugin from '@lexical/react/LexicalRichTextPlugin';
import { $getRoot, $getSelection } from 'lexical';

export interface StringEditorProps {
  placeholder?: string;
  pluginsEnabled?: boolean;
}

const defaultTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
};

const onChange = (editorState: { read: (arg0: () => void) => void }) => {
  editorState.read(() => {
    const root = $getRoot();
    const selection = $getSelection();
    console.log(root, selection);
  });
};
const onError = (error: any) => {
  console.error(error);
};
export const StringEditor = ({ placeholder, pluginsEnabled }: StringEditorProps) => {
  const initialConfig = {
    defaultTheme,
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="msla-string-editor-container">
        <LexicalRichTextPlugin
          contentEditable={<ContentEditable className="editor-input" arialabel="hello" />}
          placeholder={<div className="editor-placeholder"> {placeholder} </div>}
        />
        <LexicalOnChangePlugin onChange={onChange} />
        {pluginsEnabled ? <TreeViewPlugin /> : null}
        <AutoFocusPlugin />
        <HistoryPlugin />
      </div>
    </LexicalComposer>
  );
};
