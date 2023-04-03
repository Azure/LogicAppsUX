import type { ValueSegment } from '../editor';
import type { ExpressionEditorEvent } from '../expressioneditor';
import { ExpressionEditor } from '../expressioneditor';
import { PanelSize } from '../panel/panelUtil';
import type { TokenGroup } from './models/token';
import TokenPickerHandler from './plugins/TokenPickerHandler';
import UpdateTokenNode from './plugins/UpdateTokenNode';
import { TokenPickerFooter } from './tokenpickerfooter';
import { TokenPickerHeader } from './tokenpickerheader';
import { TokenPickerPivot } from './tokenpickerpivot';
import type { GetValueSegmentHandler } from './tokenpickersection/tokenpickeroption';
import { TokenPickerSection } from './tokenpickersection/tokenpickersection';
import type { ICalloutContentStyles, ISearchBox, PivotItem } from '@fluentui/react';
import { SearchBox, Callout, DirectionalHint } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalEditor, NodeKey } from 'lexical';
import type { editor } from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export enum TokenPickerMode {
  TOKEN = 'token',
  TOKEN_EXPRESSION = 'tokenExpression',
  EXPRESSION = 'expression',
}

export type { Token as OutputToken } from './models/token';

const directionalHint = DirectionalHint.leftTopEdge;
const gapSpace = 10;
const beakWidth = 20;

const calloutStyles: Partial<ICalloutContentStyles> = {
  calloutMain: {
    overflow: 'visible',
  },
};

export type SearchTextChangedEventHandler = (e: string) => void;

export interface TokenPickerProps {
  editorId: string;
  labelId: string;
  getValueSegmentFromToken: GetValueSegmentHandler;
  tokenGroup?: TokenGroup[];
  expressionGroup?: TokenGroup[];
  // if initialMode is undefined, it is Legacy TokenPicker
  initialMode?: TokenPickerMode;
  tokenPickerFocused?: (b: boolean) => void;
  // tokenClickedCallback is used for the code Editor TokenPicker(Legacy Token Picker)
  tokenClickedCallback?: (token: ValueSegment) => void;
  closeTokenPicker?: () => void;
}
export function TokenPicker({
  editorId,
  labelId,
  tokenGroup,
  expressionGroup,
  initialMode,
  tokenPickerFocused,
  getValueSegmentFromToken,
  tokenClickedCallback,
  closeTokenPicker,
}: TokenPickerProps): JSX.Element {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<TokenPickerMode>(initialMode ?? TokenPickerMode.TOKEN);
  const [expressionToBeUpdated, setExpressionToBeUpdated] = useState<NodeKey | null>(null);
  const [expression, setExpression] = useState<ExpressionEditorEvent>({ value: '', selectionStart: 0, selectionEnd: 0 });
  const [fullScreen, setFullScreen] = useState(false);
  const [isDraggingExpressionEditor, setIsDraggingExpressionEditor] = useState(false);
  const [expressionEditorDragDistance, setExpressionEditorDragDistance] = useState(0);
  const [expressionEditorCurrentHeight, setExpressionEditorCurrentHeight] = useState(100);
  const [expressionEditorError, setExpressionEditorError] = useState<string>('');
  const expressionEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const searchBoxRef = useRef<ISearchBox | null>(null);
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (initialMode === TokenPickerMode.EXPRESSION) {
      setTimeout(() => {
        expressionEditorRef.current?.focus();
      }, 300);
    } else {
      setTimeout(() => {
        searchBoxRef.current?.focus();
      }, 0);
    }
  }, [initialMode]);

  const handleUpdateExpressionToken = (s: string, n: NodeKey) => {
    setExpression({ value: s, selectionStart: 0, selectionEnd: 0 });
    setSelectedKey(TokenPickerMode.EXPRESSION);
    tokenPickerFocused?.(true);
    setExpressionToBeUpdated(n);

    setTimeout(() => {
      expressionEditorRef.current?.setSelection({
        startLineNumber: s.length + 1,
        startColumn: 1,
        endLineNumber: s.length + 1,
        endColumn: 1,
      });
      expressionEditorRef.current?.focus();
    }, 100);
  };

  const handleSelectKey = (item?: PivotItem) => {
    if (item?.props?.itemKey) {
      setSelectedKey(item.props.itemKey as TokenPickerMode);
    }
  };

  const onExpressionEditorBlur = (e: ExpressionEditorEvent): void => {
    setExpression(e);
  };

  const handleExpressionEditorMoveDistance = (e: any) => {
    if (isDraggingExpressionEditor) {
      setExpressionEditorDragDistance(e.clientY);
    }
  };

  const isDynamicContentAvailable = (tokenGroup: TokenGroup[]): boolean => {
    for (const tg of tokenGroup) {
      if (tg.tokens.length > 0) {
        return true;
      }
    }
    return false;
  };

  const tokenPickerPlaceHolderText = intl.formatMessage({
    defaultMessage: 'Search',
    description: 'Placeholder text to search token picker',
  });

  let editor: LexicalEditor | null;
  try {
    [editor] = useLexicalComposerContext();
  } catch {
    editor = null;
  }

  return (
    <>
      <Callout
        role="dialog"
        ariaLabelledBy={labelId}
        gapSpace={gapSpace}
        target={`#${editorId}`}
        beakWidth={beakWidth}
        directionalHint={directionalHint}
        onMouseDown={() => {
          tokenPickerFocused?.(true);
        }}
        onMouseMove={handleExpressionEditorMoveDistance}
        onMouseUp={() => {
          if (isDraggingExpressionEditor) {
            setIsDraggingExpressionEditor(false);
          }
        }}
        onDismiss={() => {
          editor?.focus();
          closeTokenPicker?.();
        }}
        onRestoreFocus={() => {
          return;
        }}
        styles={calloutStyles}
        layerProps={{
          hostId: 'msla-layer-host',
        }}
      >
        <div
          className="msla-token-picker-container"
          style={
            fullScreen
              ? { height: windowDimensions.height - 100, width: windowDimensions.width - (parseInt(PanelSize.Medium, 10) + 40) }
              : { maxHeight: '550px', width: '400px' }
          }
        >
          <div className="msla-token-picker">
            {initialMode ? (
              <TokenPickerHeader fullScreen={fullScreen} closeTokenPicker={closeTokenPicker} setFullScreen={setFullScreen} />
            ) : null}

            {initialMode === TokenPickerMode.EXPRESSION ? (
              <>
                <ExpressionEditor
                  initialValue={expression.value}
                  editorRef={expressionEditorRef}
                  onBlur={onExpressionEditorBlur}
                  isDragging={isDraggingExpressionEditor}
                  dragDistance={expressionEditorDragDistance}
                  setIsDragging={setIsDraggingExpressionEditor}
                  currentHeight={expressionEditorCurrentHeight}
                  setCurrentHeight={setExpressionEditorCurrentHeight}
                  setExpressionEditorError={setExpressionEditorError}
                />
                <div className="msla-token-picker-expression-editor-error">{expressionEditorError}</div>
                <TokenPickerPivot selectedKey={selectedKey} selectKey={handleSelectKey} hideExpressions={!!tokenClickedCallback} />
              </>
            ) : null}
            <div className="msla-token-picker-search-container">
              <SearchBox
                className="msla-token-picker-search"
                componentRef={(e) => {
                  searchBoxRef.current = e;
                }}
                placeholder={tokenPickerPlaceHolderText}
                onChange={(_, newValue) => {
                  setSearchQuery(newValue ?? '');
                }}
              />
            </div>
            <TokenPickerSection
              tokenGroup={tokenGroup ?? []}
              expressionGroup={expressionGroup ?? []}
              expressionEditorRef={expressionEditorRef}
              selectedKey={selectedKey}
              searchQuery={searchQuery}
              fullScreen={fullScreen}
              expression={expression}
              setExpression={setExpression}
              getValueSegmentFromToken={getValueSegmentFromToken}
              tokenClickedCallback={tokenClickedCallback}
              noDynamicContent={!isDynamicContentAvailable(tokenGroup ?? [])}
              expressionEditorCurrentHeight={expressionEditorCurrentHeight}
            />
            {initialMode === TokenPickerMode.EXPRESSION ? (
              <TokenPickerFooter
                expression={expression}
                expressionToBeUpdated={expressionToBeUpdated}
                setExpressionEditorError={setExpressionEditorError}
              />
            ) : null}
          </div>
        </div>
      </Callout>
      {tokenClickedCallback ? null : <TokenPickerHandler handleUpdateExpressionToken={handleUpdateExpressionToken} />}
      {tokenClickedCallback ? null : <UpdateTokenNode />}
    </>
  );
}

export function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}
