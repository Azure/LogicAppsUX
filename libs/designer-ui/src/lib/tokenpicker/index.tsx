import type { ExpressionEditorEvent } from '../expressioneditor';
import type { TokenGroup } from './models/token';
import TokenPickerHandler from './plugins/TokenPickerHandler';
import UpdateTokenNode from './plugins/UpdateTokenNode';
import { TokenPickerMode, TokenPickerPivot } from './tokenpickerpivot';
import { TokenPickerSearch } from './tokenpickersearch/tokenpickersearch';
import { TokenPickerSection } from './tokenpickersection/tokenpickersection';
import type { ICalloutContentStyles, PivotItem } from '@fluentui/react';
import { Callout, DirectionalHint } from '@fluentui/react';
import type { NodeKey } from 'lexical';
import type { editor } from 'monaco-editor';
import { useRef, useState } from 'react';

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
  tokenGroup?: TokenGroup[];
  expressionGroup?: TokenGroup[];
  initialMode?: TokenPickerMode;
  noEditor?: boolean;
  tokenPickerFocused?: (b: boolean) => void;
  setShowTokenPickerButton?: (b: boolean) => void;
  onSearchTextChanged?: SearchTextChangedEventHandler;
}
export function TokenPicker({
  editorId,
  labelId,
  tokenGroup,
  expressionGroup,
  initialMode,
  noEditor = false,
  tokenPickerFocused,
  onSearchTextChanged,
}: TokenPickerProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<TokenPickerMode>(initialMode ?? TokenPickerMode.TOKEN);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [updatingExpression, setUpdatingExpression] = useState<NodeKey | null>(null);
  const [expression, setExpression] = useState<ExpressionEditorEvent>({ value: '', selectionStart: 0, selectionEnd: 0 });
  const expressionEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const handleUpdateExpressionToken = (s: string, n: NodeKey) => {
    setExpression({ value: s, selectionStart: 0, selectionEnd: 0 });
    setSelectedKey(TokenPickerMode.EXPRESSION);
    tokenPickerFocused?.(true);
    setUpdatingExpression(n);
    setIsEditing(true);

    setTimeout(() => {
      expressionEditorRef.current?.setSelection({
        startLineNumber: s.length + 1,
        startColumn: 1,
        endLineNumber: s.length + 1,
        endColumn: 1,
      });
      expressionEditorRef.current?.focus();
    }, 50);
  };

  const handleSelectKey = (item?: PivotItem) => {
    if (item?.props?.itemKey) {
      setSearchQuery('');
      setSelectedKey(item.props.itemKey as TokenPickerMode);
      if (expression.value) {
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
    }
  };

  const handleUpdateSearch = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, text?: string) => {
    if (text != null) {
      setSearchQuery(text);
      onSearchTextChanged?.(text);
    }
  };

  const onExpressionEditorBlur = (e: ExpressionEditorEvent): void => {
    setExpression(e);
  };

  const resetTokenPicker = () => {
    setSearchQuery('');
    setSelectedKey(TokenPickerMode.TOKEN);
    setIsEditing(false);
    setUpdatingExpression(null);
    setExpression({ value: '', selectionStart: 0, selectionEnd: 0 });
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
        isBeakVisible={true}
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
        <div className="msla-token-picker-container">
          <div className="msla-token-picker">
            <TokenPickerPivot selectedKey={selectedKey} selectKey={handleSelectKey} />
            <TokenPickerSearch
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
            />

            <TokenPickerSection
              expressionEditorRef={expressionEditorRef}
              selectedKey={selectedKey}
              tokenGroup={tokenGroup ?? []}
              expressionGroup={expressionGroup ?? []}
              searchQuery={searchQuery}
              expression={expression}
              editMode={updatingExpression !== null || isEditing || selectedKey === TokenPickerMode.EXPRESSION}
              setExpression={setExpression}
              isDynamicContentAvailable={isDynamicContentAvailable(tokenGroup ?? [])}
            />
          </div>
        </div>
      </Callout>
      {noEditor ? null : <TokenPickerHandler handleUpdateExpressionToken={handleUpdateExpressionToken} />}
      {noEditor ? null : <UpdateTokenNode />}
    </>
  );
}
