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
// import { TokenPickerSearch } from './tokenpickersearch/tokenpickersearch';
import type { GetValueSegmentHandler } from './tokenpickersection/tokenpickeroption';
import { TokenPickerSection } from './tokenpickersection/tokenpickersection';
import type { ICalloutContentStyles, PivotItem } from '@fluentui/react';
import { Callout, DirectionalHint } from '@fluentui/react';
import type { NodeKey } from 'lexical';
import type { editor } from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';

export enum TokenPickerMode {
  TOKEN = 'token',
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
  initialMode?: TokenPickerMode;
  tokenPickerFocused?: (b: boolean) => void;
  onSearchTextChanged?: SearchTextChangedEventHandler;
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
  // onSearchTextChanged,
  getValueSegmentFromToken,
  tokenClickedCallback,
  closeTokenPicker,
}: TokenPickerProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<TokenPickerMode>(initialMode ?? TokenPickerMode.TOKEN);
  const [expressionToBeUpdated, setExpressionToBeUpdated] = useState<NodeKey | null>(null);
  const [expression, setExpression] = useState<ExpressionEditorEvent>({ value: '', selectionStart: 0, selectionEnd: 0 });
  const [fullScreen, setFullScreen] = useState(false);
  const expressionEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (expressionEditorRef) {
      setTimeout(() => {
        expressionEditorRef.current?.focus();
      }, 300);
    }
  }, [expressionEditorRef]);

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
      setSearchQuery('');
      setSelectedKey(item.props.itemKey as TokenPickerMode);
    }
  };

  // const handleUpdateSearch = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, text?: string) => {
  //   if (text != null) {
  //     setSearchQuery(text);
  //     onSearchTextChanged?.(text);
  //   }
  // };

  const onExpressionEditorBlur = (e: ExpressionEditorEvent): void => {
    setExpression(e);
  };

  const isDynamicContentAvailable = (tokenGroup: TokenGroup[]): boolean => {
    for (const tg of tokenGroup) {
      if (tg.tokens.length > 0) {
        return true;
      }
    }
    return false;
  };

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
        onDismiss={() => {
          tokenPickerFocused?.(false);
        }}
        onRestoreFocus={() => {
          return;
        }}
        styles={calloutStyles}
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
                <ExpressionEditor initialValue={expression.value} editorRef={expressionEditorRef} onBlur={onExpressionEditorBlur} />
                <TokenPickerPivot selectedKey={selectedKey} selectKey={handleSelectKey} hideExpressions={!!tokenClickedCallback} />
              </>
            ) : null}
            {/* <TokenPickerSearch
              selectedKey={selectedKey}
              searchQuery={searchQuery}
              setSearchQuery={handleUpdateSearch}
              expressionEditorRef={expressionEditorRef}
              expressionEditorBlur={onExpressionEditorBlur}
              expression={expression}
              updatingExpression={updatingExpression}
              isEditing={isEditing}
              resetTokenPicker={resetTokenPicker}
              isDynamicContentAvailable={isDynamicContentAvailable(tokenGroup ?? [])}
            /> */}

            <TokenPickerSection
              expressionEditorRef={expressionEditorRef}
              selectedKey={selectedKey}
              tokenGroup={tokenGroup ?? []}
              expressionGroup={expressionGroup ?? []}
              searchQuery={searchQuery}
              expression={expression}
              editMode={expressionToBeUpdated !== null || selectedKey === TokenPickerMode.EXPRESSION}
              fullScreen={fullScreen}
              setExpression={setExpression}
              isDynamicContentAvailable={isDynamicContentAvailable(tokenGroup ?? [])}
              getValueSegmentFromToken={getValueSegmentFromToken}
              tokenClickedCallback={tokenClickedCallback}
            />
            {initialMode === TokenPickerMode.EXPRESSION ? (
              <TokenPickerFooter expression={expression} expressionToBeUpdated={expressionToBeUpdated} />
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
