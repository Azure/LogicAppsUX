import { RichTextToolbar } from '../../html/plugins/toolbar/RichTextToolbar';
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
import { PasswordMaskPlugin } from './plugins/PasswordMaskPlugin';
import { PastePlugin } from './plugins/Paste';
import { PreventPropagationPlugin } from './plugins/PreventPropagation';
import { ReadOnly } from './plugins/ReadOnly';
import SingleValueSegment from './plugins/SingleValueSegment';
import { TokenTypeAheadPlugin } from './plugins/TokenTypeahead';
import { TreeView } from './plugins/TreeView';
import type { TokenPickerButtonEditorProps } from './plugins/tokenpickerbutton';
import { TokenPickerButton } from './plugins/tokenpickerbutton';
import { css } from '@fluentui/react';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin as History } from '@lexical/react/LexicalHistoryPlugin';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';
import type { AgentParameterButtonProps } from './plugins/tokenpickerbutton/agentParameterButton';
import { AgentParameterButton } from './plugins/tokenpickerbutton/agentParameterButton';
import UpdateTokenNodes from './plugins/UpdateTokenNodes';

export interface ChangeState {
  value: ValueSegment[];
  viewModel?: any; // TODO - Should be strongly typed once updated for Array
}

export type GetTokenPickerHandler = (
  editorId: string,
  labelId: string,
  tokenPickerMode?: TokenPickerMode,
  valueType?: string,
  tokenClickedCallback?: (token: ValueSegment) => void
) => JSX.Element;

export type ChangeHandler = (newState: ChangeState, skipStateSave?: boolean) => void;
export type CallbackHandler = () => void;
export type CastHandler = (value: ValueSegment[], type?: string, format?: string, suppressCasting?: boolean) => string;
export type loadParameterValueFromStringHandler = (value: string) => ValueSegment[];

export interface DictionaryCallbackProps {
  addItem: (index: number) => void;
  index: number;
}

export interface BaseEditorProps {
  initialValue: ValueSegment[];
  // Appearance
  className?: string;
  placeholder?: string;
  label?: string;
  labelId?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
  // Behavior
  readonly?: boolean;
  isSwitchFromPlaintextBlocked?: boolean;
  valueType?: string;
  tokenMapping?: Record<string, ValueSegment>;
  spellCheck?: boolean;
  // Plugins & Extensions
  agentParameterButtonProps?: Partial<AgentParameterButtonProps>;
  basePlugins?: BasePlugins;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  // Event Handlers
  onChange?: ChangeHandler;
  onBlur?: () => void;
  onFocus?: () => void;
  getTokenPicker?: GetTokenPickerHandler;
  setIsValuePlaintext?: (isValuePlaintext: boolean) => void;
  loadParameterValueFromString?: loadParameterValueFromStringHandler;
  // Misc
  dataAutomationId?: string;
  children?: React.ReactNode;
}

export interface BasePlugins {
  autoFocus?: boolean;
  autoLink?: boolean;
  clearEditor?: boolean;
  history?: boolean;
  tokens?: boolean;
  treeView?: boolean;
  preventPropagation?: boolean;
  htmlEditor?: 'rich-html' | 'raw-html' | false;
  tabbable?: boolean;
  singleValueSegment?: boolean;
  passwordMask?: boolean;
}

export const BaseEditor = ({
  className,
  readonly = false,
  placeholder,
  basePlugins = {},
  children,
  labelId,
  ariaLabel,
  agentParameterButtonProps,
  tokenPickerButtonProps,
  valueType,
  dataAutomationId,
  tokenMapping,
  isSwitchFromPlaintextBlocked,
  loadParameterValueFromString,
  onFocus,
  onBlur,
  getTokenPicker,
  setIsValuePlaintext,
  style,
  spellCheck = false,
}: BaseEditorProps) => {
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
    treeView = false,
    htmlEditor = false,
    tabbable,
    singleValueSegment = false,
    preventPropagation = true,
    passwordMask = false,
  } = basePlugins;

  const describedByMessage = intl.formatMessage({
    defaultMessage: 'Add dynamic data or expressions by inserting a /',
    id: 'Q5w4Do',
    description: 'This is an a11y message meant to help screen reader users figure out how to insert dynamic data',
  });

  const handleFocus = () => {
    onFocus?.();
    setIsEditorFocused(true);
  };

  const handleBlur = () => {
    if (!isTokenPickerOpened) {
      onBlur?.();
    }
    setIsEditorFocused(false);
  };

  const handleClick = () => {
    if (isTokenPickerOpened) {
      setIsTokenPickerOpened(false);
    }
  };

  const openTokenPicker = (mode: TokenPickerMode, callback?: () => void) => {
    setIsTokenPickerOpened(true);
    setTokenPickerMode(mode);

    // Ensure the callback runs after state updates are applied
    requestAnimationFrame(() => {
      callback?.();
    });
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
        style={style ?? { position: 'relative' }}
      >
        {htmlEditor ? (
          <RichTextToolbar
            isRawText={htmlEditor === 'raw-html'}
            isSwitchFromPlaintextBlocked={isSwitchFromPlaintextBlocked}
            readonly={readonly}
            setIsRawText={setIsValuePlaintext}
          />
        ) : null}
        <TextPlugin
          contentEditable={
            <ContentEditable
              data-testid={`${labelId} contenteditable`}
              spellCheck={spellCheck}
              className={css('editor-input', readonly && 'readonly')}
              ariaLabel={ariaLabel}
              ariaLabelledBy={labelId}
              ariaDescribedBy={id}
              tabIndex={0}
              title={placeholder}
              style={{ paddingInlineEnd: agentParameterButtonProps?.showAgentParameterButton ? '32px' : '0' }}
            />
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
        {preventPropagation ? <PreventPropagationPlugin /> : null}
        {passwordMask ? <PasswordMaskPlugin /> : null}
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
            <UpdateTokenNodes />
            <TokenTypeAheadPlugin
              openTokenPicker={openTokenPicker}
              isEditorFocused={isEditorFocused}
              hideTokenPickerOptions={tokenPickerButtonProps?.hideButtonOptions}
            />
          </>
        ) : null}
        {tokens ? <PastePlugin segmentMapping={tokenMapping} loadParameterValueFromString={loadParameterValueFromString} /> : null}
        {htmlEditor && floatingAnchorElem ? (
          <FloatingLinkEditorPlugin anchorElem={floatingAnchorElem} isMainEditorFocused={isEditorFocused} />
        ) : null}
        {children}
        {tokens && isTokenPickerOpened && getTokenPicker ? getTokenPicker(editorId, labelId ?? '', tokenPickerMode, valueType) : null}
        {tokens && isEditorFocused && !isTokenPickerOpened && agentParameterButtonProps?.showAgentParameterButton ? (
          <AgentParameterButton openTokenPicker={openTokenPicker} shifted={agentParameterButtonProps?.shifted} />
        ) : null}
      </div>
      {tokens && isEditorFocused && !isTokenPickerOpened
        ? createPortal(
            <TokenPickerButton
              {...tokenPickerButtonProps}
              openTokenPicker={openTokenPicker}
              showAgentParameterButton={agentParameterButtonProps?.showAgentParameterButton}
            />,
            document.body
          )
        : null}
    </>
  );
};
