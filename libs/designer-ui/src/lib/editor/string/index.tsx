import AutoFocusPlugin from './plugins/AutoFocusPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import SingleLinePlugin from './plugins/SingleLinePlugin';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import LexicalClearEditorPlugin from '@lexical/react/LexicalClearEditorPlugin';
import LexicalComposer from '@lexical/react/LexicalComposer';
import ContentEditable from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';
import LexicalRichTextPlugin from '@lexical/react/LexicalRichTextPlugin';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import type { EditorState } from 'lexical';
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

const onChange = (editorState: EditorState) => {
  editorState.read(() => {
    const root = $getRoot();
    const selection = $getSelection();
    // console.log(root, selection);
  });
};
const onError = (error: Error) => {
  console.error(error);
};
export const StringEditor = ({ placeholder, pluginsEnabled }: StringEditorProps) => {
  const initialConfig = {
    defaultTheme,
    onError,
    nodes: [TableCellNode, TableNode, TableRowNode, AutoLinkNode, LinkNode],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="msla-string-editor-container">
        <LexicalRichTextPlugin
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={<div className="editor-placeholder"> {placeholder} </div>}
        />
        <LexicalOnChangePlugin onChange={onChange} />
        {pluginsEnabled ? <TreeViewPlugin /> : null}
        <AutoFocusPlugin />
        <HistoryPlugin />
        <AutoLinkPlugin />
        <LexicalClearEditorPlugin />
        <SingleLinePlugin />
      </div>
    </LexicalComposer>
  );
};
