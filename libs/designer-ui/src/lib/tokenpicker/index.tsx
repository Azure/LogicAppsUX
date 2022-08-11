import type { IntellisenseControlEvent } from '../intellisensecontrol';
import type { TokenGroup } from './models/token';
import { TokenPickerMode, TokenPickerPivot } from './tokenpickerpivot';
import { TokenPickerSearch } from './tokenpickersearch/tokenpickersearch';
import { TokenPickerSection } from './tokenpickersection/tokenpickersection';
import type { PivotItem } from '@fluentui/react';
import { Callout, DirectionalHint } from '@fluentui/react';
import type { editor } from 'monaco-editor';
import { useRef, useState } from 'react';

export type { Token as OutputToken } from './models/token';

const directionalHint = DirectionalHint.leftTopEdge;
const gapSpace = 10;
const beakWidth = 20;

export type SearchTextChangedEventHandler = (e: string) => void;

export interface TokenPickerProps {
  editorId: string;
  labelId: string;
  tokenGroup?: TokenGroup[];
  expressionGroup?: TokenGroup[];
  initialMode?: TokenPickerMode;
  initialExpression: string;
  isEditing?: boolean /* TODO: add isEditing*/;
  setInTokenPicker?: (b: boolean) => void;
  onSearchTextChanged?: SearchTextChangedEventHandler;
}
export default function TokenPicker({
  editorId,
  labelId,
  tokenGroup,
  expressionGroup,
  initialMode,
  initialExpression,
  setInTokenPicker,
  onSearchTextChanged,
}: TokenPickerProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<TokenPickerMode>(initialMode ?? TokenPickerMode.TOKEN);
  const [expression, setExpression] = useState<IntellisenseControlEvent>({ value: initialExpression, selectionStart: 0, selectionEnd: 0 });
  const expressionEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleSelectKey = (item?: PivotItem) => {
    if (item?.props?.itemKey) {
      setSelectedKey(item.props.itemKey as TokenPickerMode);
    }
  };

  const handleUpdateSearch = (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, text?: string) => {
    if (text != null) {
      setSearchQuery(text);
      onSearchTextChanged?.(text);
    }
  };

  const onExpressionEditorBlur = (e: IntellisenseControlEvent): void => {
    setExpression(e);
  };

  return (
    <Callout
      role="dialog"
      ariaLabelledBy={labelId}
      gapSpace={gapSpace}
      target={`#${editorId}`}
      isBeakVisible={true}
      beakWidth={beakWidth}
      directionalHint={directionalHint}
      onMouseDown={() => {
        setInTokenPicker?.(true);
      }}
      onDismiss={() => {
        setInTokenPicker?.(false);
      }}
      onRestoreFocus={() => {
        return;
      }}
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
            setExpression={setExpression}
            setSelectedKey={setSelectedKey}
          />

          <TokenPickerSection
            expressionEditorRef={expressionEditorRef}
            selectedKey={selectedKey}
            tokenGroup={tokenGroup ?? []}
            expressionGroup={expressionGroup ?? []}
            searchQuery={searchQuery}
            expression={expression}
            setExpression={setExpression}
          />
        </div>
      </div>
    </Callout>
  );
}
