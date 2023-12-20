import { Toolbar } from '../../html/plugins/toolbar/Toolbar';
import { DESELECT_NODE } from '../../token/inputToken';
import type { TokenPickerMode } from '../../tokenpicker';
import { useId } from '../../useId';
import type { ValueSegment } from '../models/parameter';
import { ArrowNavigation } from './plugins/ArrowNavigation';
import { AutoFocus } from './plugins/AutoFocus';
import AutoLink from './plugins/AutoLink';
import ClearEditor from './plugins/ClearEditor';
import CloseTokenPicker from './plugins/CloseTokenPicker';
import DeleteTokenNode from './plugins/DeleteTokenNode';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditor';
import { FocusChangePlugin } from './plugins/FocusHandler';
import IgnoreTab from './plugins/IgnoreTab';
import InsertTokenNode from './plugins/InsertTokenNode';
import OpenTokenPicker from './plugins/OpenTokenPicker';
import { PastePlugin } from './plugins/Paste';
import { ReadOnly } from './plugins/ReadOnly';
import SingleValueSegment from './plugins/SingleValueSegment';
import { TokenTypeAheadPlugin } from './plugins/TokenTypeahead';
import { TreeView } from './plugins/TreeView';
import type { TokenPickerButtonEditorProps } from './plugins/tokenpickerbutton';
import { TokenPickerButton } from './plugins/tokenpickerbutton';
import { css } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin as History } from '@lexical/react/LexicalHistoryPlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';

export interface ChangeState {
  value: ValueSegment[];
  viewModel?: any; // TODO - Should be strongly typed once updated for Array
}

export type GetTokenPickerHandler = (
  editorId: string,
  labelId: string,
  tokenPickerMode?: TokenPickerMode,
  valueType?: string,
  setInTokenpicker?: (b: boolean) => void,
  tokenClickedCallback?: (token: ValueSegment) => void
) => JSX.Element;

export type ChangeHandler = (newState: ChangeState) => void;
export type CallbackHandler = () => void;
export type CastHandler = (value: ValueSegment[], type?: string, format?: string, suppressCasting?: boolean) => string;

export interface DictionaryCallbackProps {
  addItem: (index: number) => void;
  index: number;
}
export interface BaseEditorProps {
  className?: string;
  readonly?: boolean;
  placeholder?: string;
  basePlugins?: BasePlugins;
  initialValue: ValueSegment[];
  children?: React.ReactNode;
  labelId?: string;
  label?: string;
  valueType?: string;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  dataAutomationId?: string;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: (value: string) => ValueSegment[];
  onChange?: ChangeHandler;
  onBlur?: () => void;
  onFocus?: () => void;
  getTokenPicker: GetTokenPickerHandler;
  setIsValuePlaintext?: (isValuePlaintext: boolean) => void;
}

export interface BasePlugins {
  autoFocus?: boolean;
  autoLink?: boolean;
  clearEditor?: boolean;
  history?: boolean;
  tokens?: boolean;
  treeView?: boolean;
  htmlEditor?: 'rich-html' | 'raw-html' | false;
  tabbable?: boolean;
  singleValueSegment?: boolean;
}

export const BaseEditor = ({
  className,
  readonly = false,
  placeholder,
  basePlugins = {},
  children,
  labelId,
  tokenPickerButtonProps,
  valueType,
  dataAutomationId,
  tokenMapping,
  loadParameterValueFromString,
  onFocus,
  onBlur,
  getTokenPicker,
  setIsValuePlaintext,
}: BaseEditorProps) => {
  const [editor] = useLexicalComposerContext();
  const editorId = useId('msla-tokenpicker-callout-location');
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [isTokenPickerOpened, setIsTokenPickerOpened] = useState(false);
  const [tokenPickerMode, setTokenPickerMode] = useState<TokenPickerMode | undefined>();
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  useEffect(() => {
    if (containerRef.current && placeholderRef.current) {
      onRef(containerRef.current);
    }
  }, []);

  const {
    autoFocus,
    autoLink,
    clearEditor,
    history = true,
    tokens = true,
    treeView,
    htmlEditor = false,
    tabbable,
    singleValueSegment = false,
  } = basePlugins;

  const describedByMessage = intl.formatMessage({
    defaultMessage: 'Add dynamic data or expressions by inserting a /',
    description: 'This is an a11y message meant to help screen reader users figure out how to insert dynamic data',
  });

  const handleFocus = () => {
    onFocus?.();
    setIsEditorFocused(true);
  };

  const handleBlur = () => {
    if (!isTokenPickerOpened) {
      editor.dispatchCommand(DESELECT_NODE, undefined);
      onBlur?.();
    }
    setIsEditorFocused(false);
  };

  const handleClick = () => {
    if (isTokenPickerOpened) {
      setIsTokenPickerOpened(false);
    }
  };

  const openTokenPicker = (mode: TokenPickerMode) => {
    setIsTokenPickerOpened(true);
    setTokenPickerMode(mode);
  };

  const id = useId('msla-described-by-message');
  const TextPlugin = htmlEditor === 'rich-html' ? RichTextPlugin : PlainTextPlugin;

  return (
    <>
      <div
        className={className ?? 'msla-editor-container'}
        id={editorId}
        ref={containerRef}
        data-automation-id={dataAutomationId}
        title={placeholder}
      >
        {htmlEditor ? <Toolbar isRawText={htmlEditor === 'raw-html'} readonly={readonly} setIsRawText={setIsValuePlaintext} /> : null}
        <TextPlugin
          contentEditable={
            <ContentEditable className={css('editor-input', readonly && 'readonly')} ariaLabelledBy={labelId} ariaDescribedBy={id} />
          }
          placeholder={
            <span className="editor-placeholder" ref={placeholderRef}>
              {placeholder}
            </span>
          }
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
        <FocusChangePlugin onFocus={handleFocus} onBlur={handleBlur} onClick={handleClick} />
        <ReadOnly readonly={readonly} />
        {tabbable ? null : <IgnoreTab />}
        {htmlEditor === 'rich-html' ? null : <ArrowNavigation />}
        {tokens ? (
          <>
            <InsertTokenNode />
            <DeleteTokenNode />
            <OpenTokenPicker openTokenPicker={openTokenPicker} />
            <CloseTokenPicker closeTokenPicker={() => setIsTokenPickerOpened(false)} />
            <TokenTypeAheadPlugin
              openTokenPicker={openTokenPicker}
              isEditorFocused={isEditorFocused}
              hideTokenPickerOptions={tokenPickerButtonProps?.hideButtonOptions}
            />
          </>
        ) : null}
        {tokens && !htmlEditor ? (
          <PastePlugin segmentMapping={tokenMapping} loadParameterValueFromString={loadParameterValueFromString} />
        ) : null}
        {htmlEditor && floatingAnchorElem ? <FloatingLinkEditorPlugin anchorElem={floatingAnchorElem} /> : null}
        {children}
        {tokens && isTokenPickerOpened ? getTokenPicker(editorId, labelId ?? '', tokenPickerMode, valueType, setIsTokenPickerOpened) : null}
      </div>
      {tokens && isEditorFocused && !isTokenPickerOpened
        ? createPortal(<TokenPickerButton {...tokenPickerButtonProps} openTokenPicker={openTokenPicker} />, document.body)
        : null}
    </>
  );
};
