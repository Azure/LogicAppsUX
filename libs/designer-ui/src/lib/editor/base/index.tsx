import type { InputTokenProps } from '../../token/inputToken';
import type { ValueSegmentType } from '../models/parameter';
import { prepopulatedRichText } from './initialConfig';
import { TokenNode } from './nodes/tokenNode';
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

export type Segment = {
  segmentId?: string;
} & (
  | {
      type: ValueSegmentType.TOKEN;
      token: InputTokenProps;
    }
  | {
      type: ValueSegmentType.LITERAL;
      value: string;
    }
);

export interface BaseEditorProps {
  className?: string;
  readonly?: boolean;
  placeholder?: string;
  BasePlugins?: BasePlugins;
  initialValue?: Segment[];
  children?: React.ReactNode;
}

export interface BasePlugins {
  autoFocus?: boolean;
  autoLink?: boolean;
  clearEditor?: boolean;
  history?: boolean;
  tokens?: boolean;
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

export const BaseEditor = ({ className, readonly = false, placeholder, BasePlugins = {}, initialValue, children }: BaseEditorProps) => {
  const intl = useIntl();
  const initialConfig = {
    defaultTheme,
    onError,
    readOnly: readonly,
    nodes: [TableCellNode, TableNode, TableRowNode, AutoLinkNode, LinkNode, TokenNode],
  };

  const { autoFocus = true, autoLink, clearEditor, history = true, tokens, treeView } = BasePlugins;

  const editorInputLabel = intl.formatMessage({
    defaultMessage: 'Editor Input',
    description: 'Label for input Field for String Editor',
  });

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={className ?? 'msla-base-editor'}>
        <LexicalRichTextPlugin
          contentEditable={<ContentEditable className="editor-input" ariaLabel={editorInputLabel} />}
          placeholder={<span className="editor-placeholder"> {placeholder} </span>}
          initialEditorState={
            initialValue &&
            (() => {
              prepopulatedRichText(initialValue, tokens);
            })
          }
        />
        <LexicalOnChangePlugin onChange={onChange} />
        {treeView ? <TreeViewPlugin /> : null}
        {autoFocus ? <AutoFocusPlugin /> : null}
        {history ? <HistoryPlugin /> : null}
        {autoLink ? <AutoLinkPlugin /> : null}
        {/* 
          NOTE 14672766: Commenting out TokenPlugin because has a few issues
          and is not needed for read only. Will revisit later.
        */}
        {/* {tokens ? <TokenPlugin data={[]} /> : null} */}
        {clearEditor ? <ClearEditorPlugin /> : null}
        {children}
        <LexicalClearEditorPlugin />
      </div>
    </LexicalComposer>
  );
};
