import { Toolbar } from '../../html/plugins/toolbar';
import type { TokenPickerMode } from '../../tokenpicker';
import { useId } from '../../useId';
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
import OpenTokenPicker from './plugins/OpenTokenPicker';
import { ReadOnly } from './plugins/ReadOnly';
import SingleValueSegment from './plugins/SingleValueSegment';
import { TokenTypeAheadPlugin } from './plugins/TokenTypeahead';
import { TreeView } from './plugins/TreeView';
import type { TokenPickerButtonEditorProps } from './plugins/tokenpickerbuttonnew';
import { TokenPickerButtonNew } from './plugins/tokenpickerbuttonnew';
import EditorTheme from './themes/editorTheme';
import { parseSegments } from './utils/parsesegments';
import type { ICalloutProps } from '@fluentui/react';
import { DirectionalHint, css, TooltipHost } from '@fluentui/react';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin as History } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useFunctionalState } from '@react-hookz/web';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';

export { testTokenSegment, outputToken, outputToken2 } from '../shared/testtokensegment';

export interface ChangeState {
  value: ValueSegment[];
  viewModel?: any; // TODO - Should be strongly typed once updated for Array
}

export type GetTokenPickerHandler = (
  editorId: string,
  labelId: string,
  tokenPickerMode?: TokenPickerMode,
  closeTokenPicker?: () => void,
  tokenPickerClicked?: (b: boolean) => void,
  tokenClickedCallback?: (token: ValueSegment) => void
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
  isTrigger?: boolean;
  showCallbackTokens?: boolean;
  labelId?: string;
  label?: string;
  tokenPickerButtonEditorProps?: TokenPickerButtonEditorProps;
  onChange?: ChangeHandler;
  onBlur?: () => void;
  onFocus?: () => void;
  getTokenPicker: GetTokenPickerHandler;
}

export interface BasePlugins {
  autoFocus?: boolean;
  autoLink?: boolean;
  clearEditor?: boolean;
  history?: boolean;
  tokens?: boolean;
  treeView?: boolean;
  toolBar?: boolean;
  tabbable?: boolean;
  singleValueSegment?: boolean;
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
  labelId,
  isTrigger,
  showCallbackTokens,
  tokenPickerButtonEditorProps,
  onFocus,
  onBlur,
  getTokenPicker,
}: BaseEditorProps) => {
  const editorId = useId('msla-tokenpicker-callout-location');
  const intl = useIntl();
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [getInTokenPicker, setInTokenPicker] = useFunctionalState(false);
  const [tokenPickerMode, setTokenPickerMode] = useState<TokenPickerMode | undefined>();
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

  const { autoFocus, autoLink, clearEditor, history = true, tokens, treeView, toolBar, tabbable, singleValueSegment } = BasePlugins;
  const describedByMessage = intl.formatMessage({
    defaultMessage: 'Add dynamic data or expressions by inserting a /',
    description: 'This is an a11y message meant to help screen reader users figure out how to insert dynamic data',
  });

  const closeTokenPicker = () => {
    setInTokenPicker(false);
  };

  const handleFocus = () => {
    setIsEditorFocused(true);
    setInTokenPicker(false);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsEditorFocused(false);
    if (!getInTokenPicker()) {
      setTokenPickerMode(undefined);
      setInTokenPicker(false);
      onBlur?.();
    }
  };

  const openTokenPicker = (mode: TokenPickerMode) => {
    setTokenPickerMode(mode);
    setInTokenPicker(true);
  };

  const tokenPickerClicked = (b: boolean) => {
    setInTokenPicker(b);
  };

  const calloutProps: Partial<ICalloutProps> = {
    gapSpace: 1,
    isBeakVisible: false,
    hidden: isEditorFocused,
    directionalHint: DirectionalHint.bottomRightEdge,
  };
  const id = useId('deiosnoin');
  return (
    <TooltipHost content={placeholder} calloutProps={calloutProps} styles={{ root: { width: '100%' } }}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className={className ?? 'msla-editor-container'} id={editorId}>
          {toolBar ? <Toolbar /> : null}
          <RichTextPlugin
            contentEditable={
              <ContentEditable className={css('editor-input', readonly && 'readonly')} ariaLabelledBy={labelId} ariaDescribedBy={id} />
            }
            placeholder={<span className="editor-placeholder"> {placeholder} </span>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <span id={id} hidden={true}>
            {describedByMessage}
          </span>
          {treeView ? <TreeView /> : null}
          {autoFocus ? <AutoFocus /> : null}
          {history ? <History /> : null}
          {autoLink ? <AutoLink /> : null}
          {clearEditor ? <ClearEditor showButton={false} /> : null}
          {singleValueSegment ? <SingleValueSegment /> : null}
          {tokens ? <TokenTypeAheadPlugin openTokenPicker={openTokenPicker} /> : null}
          <OnBlur command={handleBlur} />
          <OnFocus command={handleFocus} />
          <ReadOnly readonly={readonly} />
          {tabbable ? null : <IgnoreTab />}
          {tokens ? <InsertTokenNode /> : null}
          {tokens ? <DeleteTokenNode /> : null}
          {tokens ? <OpenTokenPicker openTokenPicker={openTokenPicker} /> : null}
          {children}
          {(!isTrigger || showCallbackTokens) && tokens && getInTokenPicker()
            ? getTokenPicker(editorId, labelId ?? '', tokenPickerMode, closeTokenPicker, tokenPickerClicked)
            : null}
        </div>

        {(!isTrigger || showCallbackTokens) && tokens && isEditorFocused && !getInTokenPicker() ? (
          createPortal(
            <TokenPickerButtonNew openTokenPicker={openTokenPicker} showOnLeft={tokenPickerButtonEditorProps?.showOnLeft} />,
            document.body
          )
        ) : (
          <div />
        )}
      </LexicalComposer>
    </TooltipHost>
  );
};
