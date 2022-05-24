import AutoFocusPlugin from './plugins/AutoFocusPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import ClearEditorPlugin from './plugins/ClearEditorPlugin';
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
import { useIntl } from 'react-intl';

export interface BaseEditorProps {
  className?: string;
  placeholder?: string;
  BasePlugins?: BasePlugins;
  children?: React.ReactNode;
}

export interface BasePlugins {
  autoFocus?: boolean;
  autoLink?: boolean;
  clearEditor?: boolean;
  history?: boolean;
  treeView?: boolean;
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
    console.log(root, selection);
  });
};

const onError = (error: Error) => {
  console.error(error);
};

export const BaseEditor = ({ className, placeholder, BasePlugins = {}, children }: BaseEditorProps) => {
  const intl = useIntl();
  const initialConfig = {
    defaultTheme,
    onError,
    nodes: [TableCellNode, TableNode, TableRowNode, AutoLinkNode, LinkNode],
  };

  const { autoFocus, autoLink, clearEditor, history, treeView } = BasePlugins;

  const editorInputLabel = intl.formatMessage({
    defaultMessage: 'Editor Input',
    description: 'Label for input Field for String Editor',
  });

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={className ?? 'msla-base-editor'}>
        <LexicalRichTextPlugin
          contentEditable={<ContentEditable className="editor-input" ariaLabel={editorInputLabel} />}
          placeholder={<div className="editor-placeholder"> {placeholder} </div>}
        />
        <LexicalOnChangePlugin onChange={onChange} />
        {treeView ? <TreeViewPlugin /> : null}
        {autoFocus ? <AutoFocusPlugin /> : null}
        {history ? <HistoryPlugin /> : null}
        {autoLink ? <AutoLinkPlugin /> : null}
        {clearEditor ? <ClearEditorPlugin /> : null}
        {children}
        <LexicalClearEditorPlugin />
      </div>
    </LexicalComposer>
  );
};
