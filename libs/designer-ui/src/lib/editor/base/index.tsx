import { Toolbar } from '../../html/plugins/toolbar/Toolbar';
import type { TokenPickerMode } from '../../tokenpicker';
import { useId } from '../../useId';
import type { ValueSegment } from '../models/parameter';
import { AutoFocus } from './plugins/AutoFocus';
import AutoLink from './plugins/AutoLink';
import ClearEditor from './plugins/ClearEditor';
import DeleteTokenNode from './plugins/DeleteTokenNode';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditor';
import { FocusChangePlugin } from './plugins/FocusHandler';
import IgnoreTab from './plugins/IgnoreTab';
import InsertTokenNode from './plugins/InsertTokenNode';
import OpenTokenPicker from './plugins/OpenTokenPicker';
import { ReadOnly } from './plugins/ReadOnly';
import SingleValueSegment from './plugins/SingleValueSegment';
import { TokenTypeAheadPlugin } from './plugins/TokenTypeahead';
import { TreeView } from './plugins/TreeView';
import type { TokenPickerButtonEditorProps } from './plugins/tokenpickerbutton';
import { TokenPickerButton } from './plugins/tokenpickerbutton';
import { defaultInitialConfig, defaultNodes, htmlNodes } from './utils/initialConfig';
import { parseSegments, parseHtmlSegments } from './utils/parsesegments';
import { css } from '@fluentui/react';
import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin as History } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';

export { removeQuotes } from './utils/helper';

export { testTokenSegment, outputToken, outputToken2 } from '../shared/testtokensegment';

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
  BasePlugins?: BasePlugins;
  initialValue: ValueSegment[];
  children?: React.ReactNode;
  labelId?: string;
  label?: string;
  valueType?: string;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  dataAutomationId?: string;
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
  toolbar?: boolean;
  tabbable?: boolean;
  singleValueSegment?: boolean;
}

export const BaseEditor = ({
  className,
  readonly = false,
  placeholder,
  BasePlugins = {},
  initialValue,
  children,
  labelId,
  tokenPickerButtonProps,
  valueType,
  dataAutomationId,
  onFocus,
  onBlur,
  getTokenPicker,
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

  const { autoFocus, autoLink, clearEditor, history = true, tokens, treeView, toolbar, tabbable, singleValueSegment } = BasePlugins;
  const describedByMessage = intl.formatMessage({
    defaultMessage: 'Add dynamic data or expressions by inserting a /',
    description: 'This is an a11y message meant to help screen reader users figure out how to insert dynamic data',
  });

  const initialConfig: InitialConfigType = {
    ...defaultInitialConfig,
    editable: !readonly,
    nodes: toolbar ? htmlNodes : defaultNodes,
    editorState:
      initialValue &&
      (() => {
        toolbar ? parseHtmlSegments(initialValue, tokens) : parseSegments(initialValue, tokens);
      }),
  };

  const handleFocus = useCallback(() => {
    setIsEditorFocused(true);
    onFocus?.();
    if (isTokenPickerOpened) {
      setIsTokenPickerOpened(false);
    }
  }, [isTokenPickerOpened, onFocus]);

  const handleBlur = useCallback(() => {
    setIsEditorFocused(false);
    onBlur?.();
  }, [onBlur]);

  const openTokenPicker = (mode: TokenPickerMode) => {
    setIsTokenPickerOpened(true);
    setTokenPickerMode(mode);
  };

  const id = useId('msla-described-by-message');
  return (
    <div style={{ width: '100%' }}>
      <LexicalComposer initialConfig={initialConfig}>
        <div
          className={className ?? 'msla-editor-container'}
          id={editorId}
          ref={containerRef}
          data-automation-id={dataAutomationId}
          title={placeholder}
        >
          {toolbar ? <Toolbar readonly={readonly} /> : null}
          <RichTextPlugin
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
          {tokens ? (
            <TokenTypeAheadPlugin
              openTokenPicker={openTokenPicker}
              isEditorFocused={isEditorFocused}
              hideTokenPickerOptions={tokenPickerButtonProps?.hideButtonOptions}
            />
          ) : null}
          <FocusChangePlugin onFocus={handleFocus} onBlur={handleBlur} />
          <ReadOnly readonly={readonly} />
          {tabbable ? null : <IgnoreTab />}
          {tokens ? <InsertTokenNode /> : null}
          {tokens ? <DeleteTokenNode /> : null}
          {tokens ? <OpenTokenPicker openTokenPicker={openTokenPicker} /> : null}
          {toolbar && floatingAnchorElem ? <FloatingLinkEditorPlugin anchorElem={floatingAnchorElem} /> : null}
          {children}
          {tokens && isTokenPickerOpened
            ? getTokenPicker(editorId, labelId ?? '', tokenPickerMode, valueType, setIsTokenPickerOpened)
            : null}
        </div>

        {tokens && isEditorFocused && !isTokenPickerOpened ? (
          createPortal(<TokenPickerButton {...tokenPickerButtonProps} openTokenPicker={openTokenPicker} />, document.body)
        ) : (
          <div />
        )}
      </LexicalComposer>
    </div>
  );
};
