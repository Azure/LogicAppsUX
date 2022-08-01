import type { InputTokenProps } from '../../token/inputToken';
import type { ValueSegment, ValueSegmentType } from '../models/parameter';
import { TokenNode } from './nodes/tokenNode';
import { AutoFocus } from './plugins/AutoFocus';
import AutoLink from './plugins/AutoLink';
import ClearEditor from './plugins/ClearEditor';
import OnBlur from './plugins/OnBlur';
import OnFocus from './plugins/OnFocus';
import { TreeView } from './plugins/TreeView';
import { Validation } from './plugins/Validation';
import type { ValidationProps } from './plugins/Validation';
import { parseSegments } from './utils/parsesegments';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin as History } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export { testTokenSegment } from '../shared/testtokensegment';
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

export type ChangeHandler = (newValue: ValueSegment[]) => void;

interface FocusProps {
  addDictionaryItem?: dictionaryCallbackProps;
  tokenPickerProps?: FocusTokenPickerProps;
}

export interface FocusTokenPickerProps {
  showTokenPicker?: boolean;
  buttonClassName?: string;
  buttonHeight?: number;
}

export interface dictionaryCallbackProps {
  addItem: (index: number) => void;
  index: number;
}

export interface BaseEditorProps {
  className?: string;
  readonly?: boolean;
  placeholder?: string;
  BasePlugins?: BasePlugins;
  initialValue?: Segment[];
  children?: React.ReactNode;
  onChange?: ChangeHandler;
  focusProps?: FocusProps;
}

export interface BasePlugins {
  autoFocus?: boolean;
  autoLink?: boolean;
  clearEditor?: boolean;
  history?: boolean;
  tokens?: boolean;
  treeView?: boolean;
  validation?: ValidationProps;
}

const defaultTheme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
};

const onError = (error: Error) => {
  console.error(error);
};

export const BaseEditor = ({
  className,
  readonly = false,
  placeholder,
  BasePlugins = {},
  initialValue,
  children,
  focusProps,
}: BaseEditorProps) => {
  const intl = useIntl();
  const [focused, setIsFocused] = useState(false);
  const initialConfig = {
    theme: defaultTheme,
    onError,
    readOnly: readonly,
    nodes: [TableCellNode, TableNode, TableRowNode, AutoLinkNode, LinkNode, TokenNode],
    namespace: 'editor',
    editorState:
      initialValue &&
      (() => {
        parseSegments(initialValue, tokens);
      }),
  };

  const { autoFocus = true, autoLink, clearEditor, history = true, tokens, treeView, validation } = BasePlugins;

  const editorInputLabel = intl.formatMessage({
    defaultMessage: 'Editor Input',
    description: 'Label for input Field for String Editor',
  });

  const handleFocus = () => {
    setIsFocused(true);
  };
  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={className ?? 'msla-base-editor'}>
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input" ariaLabel={editorInputLabel} />}
          placeholder={<span className="editor-placeholder"> {placeholder} </span>}
        />
        {treeView ? <TreeView /> : null}
        {autoFocus ? <AutoFocus /> : null}
        {history ? <History /> : null}
        {autoLink ? <AutoLink /> : null}
        {clearEditor ? <ClearEditor showButton={false} /> : null}
        {validation ? (
          <Validation
            type={validation.type}
            errorMessage={validation.errorMessage}
            tokensEnabled={tokens}
            className={validation.className}
            isValid={validation.isValid}
            setIsValid={validation.setIsValid}
          />
        ) : null}
        <OnFocus
          command={handleFocus}
          focused={focused}
          tokenPicker={focusProps?.tokenPickerProps}
          addDictionaryItem={focusProps?.addDictionaryItem}
        />
        <OnBlur command={handleBlur} />
        {children}
      </div>
    </LexicalComposer>
  );
};
