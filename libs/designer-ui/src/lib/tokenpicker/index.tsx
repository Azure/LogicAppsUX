// biome-ignore lint/correctness/noUnusedImports: actually is used
import type { editor } from 'monaco-editor';
import type { ValueSegment } from '../editor';
import { CLOSE_TOKENPICKER } from '../editor/base/plugins/CloseTokenPicker';
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
import { SearchBox, DirectionalHint, Callout } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalEditor, NodeKey } from 'lexical';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@fluentui/react-components';
import copilotLogo from './images/copilotLogo.svg';
import { Nl2fExpressionAssistant } from './nl2fExpressionAssistant';
import { isCopilotServiceEnabled } from '@microsoft/logic-apps-shared';

export const TokenPickerMode = {
  TOKEN: 'token',
  TOKEN_EXPRESSION: 'tokenExpression',
  EXPRESSION: 'expression',
  NL2F_EXPRESSION: 'nl2fExpression',
} as const;
export type TokenPickerMode = (typeof TokenPickerMode)[keyof typeof TokenPickerMode];

export type { Token as OutputToken } from './models/token';

const directionalHint = DirectionalHint.leftTopEdge;
const gapSpace = 10;
const beakWidth = 20;

let calloutStyles: Partial<ICalloutContentStyles> = {
  root: {
    zIndex: 1,
  },
  calloutMain: {
    overflow: 'visible',
  },
};

calloutStyles = isCopilotServiceEnabled()
  ? {
      ...calloutStyles,
      calloutMain: {
        borderRadius: '8px',
      },
      beakCurtain: {
        borderRadius: '8px',
      },
      root: {
        borderRadius: '8px',
      },
    }
  : calloutStyles;

export type SearchTextChangedEventHandler = (e: string) => void;

export interface TokenPickerProps {
  editorId: string;
  labelId: string;
  getValueSegmentFromToken: GetValueSegmentHandler;
  tokenGroup?: TokenGroup[];
  filteredTokenGroup?: TokenGroup[];
  expressionGroup?: TokenGroup[];
  // if initialMode is undefined, it is Legacy TokenPicker
  initialMode?: TokenPickerMode;
  // tokenClickedCallback is used for the code Editor TokenPicker(Legacy Token Picker)
  tokenClickedCallback?: (token: ValueSegment) => void;
  hideUTFExpressions?: boolean;
}
export function TokenPicker({
  editorId,
  labelId,
  tokenGroup,
  filteredTokenGroup,
  expressionGroup,
  initialMode,
  hideUTFExpressions,
  getValueSegmentFromToken,
  tokenClickedCallback,
}: TokenPickerProps): JSX.Element {
  const intl = useIntl();
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<TokenPickerMode>(initialMode ?? TokenPickerMode.TOKEN);
  const [expressionToBeUpdated, setExpressionToBeUpdated] = useState<NodeKey | null>(null);
  const [expression, setExpression] = useState<ExpressionEditorEvent>({ value: '', selectionStart: 0, selectionEnd: 0 });
  const [fullScreen, setFullScreen] = useState(false);
  const [isDraggingExpressionEditor, setIsDraggingExpressionEditor] = useState(false);
  const [expressionEditorDragDistance, setExpressionEditorDragDistance] = useState(0);
  const [expressionEditorCurrentHeight, setExpressionEditorCurrentHeight] = useState(windowDimensions.height < 400 ? 50 : 100);
  const [expressionEditorError, setExpressionEditorError] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const expressionEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const searchBoxRef = useRef<ISearchBox | null>(null);
  const isExpression = selectedMode === TokenPickerMode.EXPRESSION;
  const isNl2fExpression = selectedMode === TokenPickerMode.NL2F_EXPRESSION;

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isExpression || isNl2fExpression) {
      setTimeout(() => {
        expressionEditorRef.current?.focus();
      }, 300);
    } else {
      setTimeout(() => {
        searchBoxRef.current?.focus();
      }, 0);
    }
  }, [isExpression, isNl2fExpression]);

  const handleUpdateExpressionToken = (s: string, n: NodeKey) => {
    setExpression({ value: s, selectionStart: 0, selectionEnd: 0 });
    setSelectedMode(TokenPickerMode.EXPRESSION);
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
      setSelectedMode(item.props.itemKey as TokenPickerMode);
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

  const pasteLastUsedExpression = () => {
    setExpression({ ...expression, value: window.localStorage.getItem('msla-tokenpicker-expression') ?? expression.value });
    expressionEditorRef.current?.focus();
  };

  const tokenPickerPlaceHolderText = intl.formatMessage({
    defaultMessage: 'Search',
    id: 'Mc6ITJ',
    description: 'Placeholder text to search token picker',
  });

  const createWithNl2fButtonText = intl.formatMessage({
    defaultMessage: 'Create an expression with Copilot',
    id: '+Agiub',
    description: 'Button text for the create expression with copilot feature',
  });

  let editor: LexicalEditor | null;
  try {
    [editor] = useLexicalComposerContext();
  } catch {
    editor = null;
  }

  const nl2fExpressionPane = (
    <Callout
      role="dialog"
      ariaLabelledBy={labelId}
      gapSpace={gapSpace}
      target={`#${editorId}`}
      beakWidth={beakWidth}
      directionalHint={directionalHint}
      onMouseMove={handleExpressionEditorMoveDistance}
      onMouseUp={() => {
        if (isDraggingExpressionEditor) {
          setIsDraggingExpressionEditor(false);
        }
      }}
      onDismiss={(e) => {
        if (e?.type === 'keydown' && (e as React.KeyboardEvent<HTMLElement>).key === 'Escape') {
          editor?.dispatchCommand(CLOSE_TOKENPICKER, { focusEditorAfter: true });
        } else {
          editor?.dispatchCommand(CLOSE_TOKENPICKER, { focusEditorAfter: false });
        }
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
        className="msla-token-picker-container-v3"
        style={
          fullScreen
            ? {
                height: Math.max(windowDimensions.height - 100, Math.min(windowDimensions.height, 550)),
                width: Math.max(
                  windowDimensions.width - (Number.parseInt(PanelSize.Medium, 10) + 40),
                  Math.min(windowDimensions.width - 16, 400)
                ),
              }
            : { maxHeight: Math.min(windowDimensions.height, 550), width: Math.min(windowDimensions.width - 16, 400) }
        }
        ref={containerRef}
      >
        <Nl2fExpressionAssistant
          isFullScreen={fullScreen}
          expression={expression}
          isFixErrorRequest={expressionEditorError !== ''}
          setFullScreen={setFullScreen}
          setSelectedMode={setSelectedMode}
          setExpression={setExpression}
          setExpressionEditorError={setExpressionEditorError}
        />
      </div>
    </Callout>
  );

  if (isNl2fExpression) {
    return nl2fExpressionPane;
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
        onMouseMove={handleExpressionEditorMoveDistance}
        onMouseUp={() => {
          if (isDraggingExpressionEditor) {
            setIsDraggingExpressionEditor(false);
          }
        }}
        onDismiss={(e) => {
          if (e?.type === 'keydown' && (e as React.KeyboardEvent<HTMLElement>).key === 'Escape') {
            editor?.dispatchCommand(CLOSE_TOKENPICKER, { focusEditorAfter: true });
          } else {
            editor?.dispatchCommand(CLOSE_TOKENPICKER, { focusEditorAfter: false });
          }
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
          className="msla-token-picker-container-v3"
          style={
            fullScreen
              ? {
                  height: Math.max(windowDimensions.height - 100, Math.min(windowDimensions.height, 550)),
                  width: Math.max(
                    windowDimensions.width - (Number.parseInt(PanelSize.Medium, 10) + 40),
                    Math.min(windowDimensions.width - 16, 400)
                  ),
                }
              : { maxHeight: Math.min(windowDimensions.height, 550), width: Math.min(windowDimensions.width - 16, 400) }
          }
          ref={containerRef}
        >
          <div className="msla-token-picker">
            {initialMode ? (
              <TokenPickerHeader
                fullScreen={fullScreen}
                isExpression={isExpression}
                isNl2fExpression={false}
                setFullScreen={setFullScreen}
                pasteLastUsedExpression={pasteLastUsedExpression}
                setSelectedMode={setSelectedMode}
              />
            ) : null}

            {isExpression ? (
              <div className="msla-token-picker-expression-subheader">
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
                  hideUTFExpressions={hideUTFExpressions}
                />
                <div className="msla-token-picker-expression-editor-error">{expressionEditorError}</div>
                {isCopilotServiceEnabled() ? (
                  <div className="msla_token_picker_nl2fex_button_container">
                    <Button
                      className="msla-token-picker-nl2fex-use-button"
                      size="medium"
                      onClick={() => {
                        setSelectedMode(TokenPickerMode.NL2F_EXPRESSION);
                      }}
                      title={createWithNl2fButtonText}
                      aria-label={createWithNl2fButtonText}
                    >
                      <img className="msla_token_picker_nl2fex_button_icon" src={copilotLogo} alt="Copilot" />
                      <span>{createWithNl2fButtonText}</span>
                    </Button>
                  </div>
                ) : null}
                <TokenPickerPivot selectedKey={selectedMode} selectKey={handleSelectKey} hideExpressions={!!tokenClickedCallback} />
              </div>
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
                data-automation-id="msla-token-picker-search"
              />
            </div>
            <TokenPickerSection
              tokenGroup={(selectedMode === TokenPickerMode.TOKEN ? filteredTokenGroup : tokenGroup) ?? []}
              expressionGroup={expressionGroup ?? []}
              expressionEditorRef={expressionEditorRef}
              selectedMode={selectedMode}
              searchQuery={searchQuery}
              fullScreen={fullScreen}
              expression={expression}
              setExpression={setExpression}
              getValueSegmentFromToken={getValueSegmentFromToken}
              tokenClickedCallback={tokenClickedCallback}
              noDynamicContent={!isDynamicContentAvailable(filteredTokenGroup ?? [])}
              expressionEditorCurrentHeight={expressionEditorCurrentHeight}
            />
            {isExpression ? (
              <TokenPickerFooter
                tokenGroup={tokenGroup ?? []}
                expression={expression}
                expressionToBeUpdated={expressionToBeUpdated}
                getValueSegmentFromToken={getValueSegmentFromToken}
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
