import { Toolbar } from '../../html/plugins/toolbar';
import type { ValueSegment } from '../models/parameter';
import { TokenNode } from './nodes/tokenNode';
import { AutoFocus } from './plugins/AutoFocus';
import AutoLink from './plugins/AutoLink';
import ClearEditor from './plugins/ClearEditor';
import DeleteTokenNode from './plugins/DeleteTokenNode';
import IgnoreTab from './plugins/IgnoreTab';
import InsertTokenNode from './plugins/InsertTokenNode';
import OnBlur from './plugins/OnBlur';
import OnFocus from './plugins/OnFocus';
import { ReadOnly } from './plugins/ReadOnly';
import type { TokenPickerButtonProps } from './plugins/TokenPickerButton';
import TokenPickerButton from './plugins/TokenPickerButton';
import { TreeView } from './plugins/TreeView';
import EditorTheme from './themes/editorTheme';
import { parseSegments } from './utils/parsesegments';
import { css, DirectionalHint, TooltipHost } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin as History } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useFunctionalState } from '@react-hookz/web';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export { testTokenSegment, outputToken, outputToken2 } from '../shared/testtokensegment';

export interface ChangeState {
  value: ValueSegment[];
  viewModel?: any; // TODO - Should be strongly typed once updated for Array
}

export type GetTokenPickerHandler = (
  editorId: string,
  labelId: string,
  onClick?: (b: boolean) => void,
  tokenClicked?: (token: ValueSegment) => void,
  hideTokenPicker?: () => void
) => JSX.Element;
export type ChangeHandler = (newState: ChangeState) => void;
export type CallbackHandler = () => void;

export interface DictionaryCallbackProps {
  addItem: (index: number) => void;
  index: number;
}
export interface BaseEditorProps {
  className?: string;
  readonly?: boolean;
  placeholder?: string;
  BasePlugins?: BasePlugins;
  initialValue: ValueSegment[];
  children?: React.ReactNode;
  tokenPickerButtonProps?: TokenPickerButtonProps;
  isTrigger?: boolean;
  getTokenPicker: GetTokenPickerHandler;
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
  toolBar?: boolean;
}

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
  isTrigger,
  getTokenPicker,
  onFocus,
  onBlur,
}: BaseEditorProps) => {
  const intl = useIntl();
  const editorId = useId('msla-tokenpicker-callout-location');
  const labelId = useId('msla-tokenpicker-callout-label');
  const [showTokenPickerButton, setShowTokenPickerButton] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(true);
  const [getInTokenPicker, setInTokenPicker] = useFunctionalState(false);
  const { customButton = false } = tokenPickerButtonProps || {};

  const initialConfig = {
    theme: EditorTheme,
    editable: !readonly,
    onError,
    nodes: [AutoLinkNode, LinkNode, TokenNode],
    namespace: 'editor',
    editorState:
      initialValue &&
      (() => {
        parseSegments(initialValue, tokens);
      }),
  };

  const { autoFocus, autoLink, clearEditor, history = true, tokens, treeView, toolBar } = BasePlugins;

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
    if (!getInTokenPicker()) {
      if (tokens) {
        setInTokenPicker(false);
      }
      onBlur?.();
    }
    setShowTokenPickerButton(false);
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
        {toolBar ? <Toolbar /> : null}
        <RichTextPlugin
          contentEditable={<ContentEditable className={css('editor-input', readonly && 'readonly')} ariaLabel={editorInputLabel} />}
          placeholder={<span className="editor-placeholder"> {createPlaceholder(placeholder)} </span>}
        />
        {treeView ? <TreeView /> : null}
        {autoFocus ? <AutoFocus /> : null}
        {history ? <History /> : null}
        {autoLink ? <AutoLink /> : null}
        {clearEditor ? <ClearEditor showButton={false} /> : null}

        {!isTrigger && ((tokens && showTokenPickerButton) || getInTokenPicker()) ? (
          <TokenPickerButton
            customButton={customButton}
            labelId={labelId}
            showTokenPicker={showTokenPicker}
            buttonClassName={tokenPickerButtonProps?.buttonClassName}
            buttonOffset={tokenPickerButtonProps?.buttonOffset}
            setShowTokenPicker={handleShowTokenPicker}
          />
        ) : null}
        {!isTrigger && ((showTokenPickerButton && showTokenPicker) || getInTokenPicker())
          ? getTokenPicker(editorId, labelId, onClickTokenPicker, undefined, customButton ? handleShowTokenPicker : undefined)
          : null}
        <OnBlur command={handleBlur} />
        <OnFocus command={handleFocus} />
        <ReadOnly readonly={readonly} />
        <IgnoreTab />
        {tokens ? <InsertTokenNode /> : null}
        {tokens ? <DeleteTokenNode /> : null}
        {children}
      </div>
    </LexicalComposer>
  );
};
function createPlaceholder(placeholder?: string): JSX.Element {
  return (
    <TooltipHost content={placeholder} directionalHint={DirectionalHint.rightCenter}>
      {placeholder}
    </TooltipHost>
  );
}
