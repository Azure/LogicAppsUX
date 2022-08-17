import type { ValueSegment } from '../models/parameter';
import { TokenNode } from './nodes/tokenNode';
import { AutoFocus } from './plugins/AutoFocus';
import AutoLink from './plugins/AutoLink';
import ClearEditor from './plugins/ClearEditor';
import DeleteTokenNode from './plugins/DeleteTokenNode';
import InsertTokenNode from './plugins/InsertTokenNode';
import OnBlur from './plugins/OnBlur';
import OnFocus from './plugins/OnFocus';
import TokenPickerButton from './plugins/TokenPickerButton';
import { TreeView } from './plugins/TreeView';
import { Validation } from './plugins/Validation';
import type { ValidationProps } from './plugins/Validation';
import { parseSegments } from './utils/parsesegments';
import { useId } from '@fluentui/react-hooks';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin as History } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { useFunctionalState } from '@react-hookz/web';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export { testTokenSegment, outputToken, outputToken2 } from '../shared/testtokensegment';

export interface ChangeState {
  value: ValueSegment[];
  viewModel?: any; // TODO - Should be strongly typed once updated for Array
}

export type ChangeHandler = (newState: ChangeState) => void;

export interface DictionaryCallbackProps {
  addItem: (index: number) => void;
  index: number;
}

export interface TokenPickerButtonProps {
  buttonClassName?: string;
  buttonHeight?: number;
  setShowTokenPicker?: () => void;
}

export interface BaseEditorProps {
  className?: string;
  readonly?: boolean;
  placeholder?: string;
  BasePlugins?: BasePlugins;
  initialValue: ValueSegment[];
  children?: React.ReactNode;
  tokenPickerButtonProps?: TokenPickerButtonProps;
  GetTokenPicker: (editorId: string, labelId: string, onClick?: (b: boolean) => void) => JSX.Element;
  onChange?: ChangeHandler;
  onBlur?: () => void;
  onFocus?: () => void;
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
  tokenPickerButtonProps,
  GetTokenPicker,
  onBlur,
  onFocus,
}: BaseEditorProps) => {
  const intl = useIntl();
  const editorId = useId('msla-tokenpicker-callout-location');
  const labelId = useId('msla-tokenpicker-callout-label');
  const [showTokenPickerButton, setShowTokenPickerButton] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(true);
  const [getInTokenPicker, setInTokenPicker] = useFunctionalState(false);
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
  const { autoFocus, autoLink, clearEditor, history = true, tokens, treeView, validation } = BasePlugins;

  const editorInputLabel = intl.formatMessage({
    defaultMessage: 'Editor Input',
    description: 'Label for input Field for String Editor',
  });

  const handleFocus = () => {
    if (tokens) {
      setShowTokenPickerButton(true);
    }
    setInTokenPicker(false);
    onFocus?.();
  };
  const handleBlur = () => {
    if (tokens && !getInTokenPicker()) {
      setInTokenPicker(false);
    }
    setShowTokenPickerButton(false);
    onBlur?.();
  };

  const handleShowTokenPicker = () => {
    if (showTokenPicker) {
      setInTokenPicker(false);
    }
    setShowTokenPicker(!showTokenPicker);
  };

  const onClickTokenPicker = (b: boolean) => {
    setInTokenPicker(b);
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={className ?? 'msla-editor-container'} id={editorId}>
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

        {(tokens && showTokenPickerButton) || getInTokenPicker() ? (
          <TokenPickerButton
            labelId={labelId}
            showTokenPicker={showTokenPicker}
            buttonClassName={tokenPickerButtonProps?.buttonClassName}
            buttonHeight={tokenPickerButtonProps?.buttonHeight}
            setShowTokenPicker={handleShowTokenPicker}
          />
        ) : null}
        {(showTokenPickerButton && showTokenPicker) || getInTokenPicker() ? GetTokenPicker(editorId, labelId, onClickTokenPicker) : null}
        <OnBlur command={handleBlur} />
        <OnFocus command={handleFocus} />
        {tokens ? <InsertTokenNode /> : null}
        {tokens ? <DeleteTokenNode /> : null}
        {children}
      </div>
    </LexicalComposer>
  );
};
