// biome-ignore lint/correctness/noUnusedImports: actually is used
import type { editor } from 'monaco-editor';
import type { ExpressionEditorEvent } from '../../expressioneditor';
import { ExpressionEditor } from '../../expressioneditor';
import { useEffect, useRef, useState } from 'react';
import { TokenPickerMode, getWindowDimensions } from '../../tokenpicker';
import type { ICalloutContentStyles, ISearchBox, PivotItem } from '@fluentui/react';
import { Callout, DirectionalHint, SearchBox } from '@fluentui/react';
import { TokenPickerPivot } from '../../tokenpicker/tokenpickerpivot';
import { useIntl } from 'react-intl';
import { TokenPickerSection } from '../../tokenpicker/tokenpickersection/tokenpickersection';
import { TokenPickerFooter } from '../../tokenpicker/tokenpickerfooter';
import type { TokenGroup } from '../../tokenpicker/models/token';
import type { GetValueSegmentHandler } from '../../tokenpicker/tokenpickersection/tokenpickeroption';
import type { NodeKey } from 'lexical';
import { useBoolean } from '@fluentui/react-hooks';

export interface ConditionExpressionProps {
  editorId: string;
  labelId: string;
  getValueSegmentFromToken: GetValueSegmentHandler;
  tokenGroup?: TokenGroup[];
  filteredTokenGroup?: TokenGroup[];
  expressionGroup?: TokenGroup[];
  onChange: (value: string) => void;
}

export function ConditionExpression({
  editorId,
  labelId,
  filteredTokenGroup,
  tokenGroup,
  expressionGroup,
  getValueSegmentFromToken,
}: ConditionExpressionProps): JSX.Element {
  const intl = useIntl();
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const [expression, setExpression] = useState<ExpressionEditorEvent>({ value: '', selectionStart: 0, selectionEnd: 0 });
  const [isDraggingExpressionEditor, setIsDraggingExpressionEditor] = useState(false);
  const [expressionEditorDragDistance, setExpressionEditorDragDistance] = useState(0);
  const [expressionEditorCurrentHeight, setExpressionEditorCurrentHeight] = useState(windowDimensions.height < 400 ? 50 : 100);
  const [_expressionEditorError, setExpressionEditorError] = useState<string>('');
  const [expressionToBeUpdated, _setExpressionToBeUpdated] = useState<NodeKey | null>(null);
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<TokenPickerMode>(TokenPickerMode.EXPRESSION);

  const searchBoxRef = useRef<ISearchBox | null>(null);
  const expressionEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const tokenPickerPlaceHolderText = intl.formatMessage({
    defaultMessage: 'Search',
    id: 'Mc6ITJ',
    description: 'Placeholder text to search token picker',
  });

  const handleSelectKey = (item?: PivotItem) => {
    if (item?.props?.itemKey) {
      setSelectedKey(item.props.itemKey as TokenPickerMode);
    }
  };

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const calloutStyles: Partial<ICalloutContentStyles> = {
    root: {
      width: '500px',
      maxWidth: '500px',
      maxHeight: '470px !important',
    },
    calloutMain: {
      overflow: 'visible',
    },
  };

  // Pending things to do
  // 1.- on value change
  // 2.- z-index

  return (
    <>
      <div
        id={`condition-expression-${editorId}`}
        onMouseUp={() => {
          if (isDraggingExpressionEditor) {
            setIsDraggingExpressionEditor(false);
          }
        }}
        onMouseMove={handleExpressionEditorMoveDistance}
      >
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
          hideUTFExpressions={false}
          onFocus={toggleIsCalloutVisible}
        />
      </div>
      {isCalloutVisible && (
        <Callout
          role="dialog"
          ariaLabelledBy={labelId}
          target={`#condition-expression-${editorId}`}
          isBeakVisible={false}
          directionalHint={DirectionalHint.bottomCenter}
          onRestoreFocus={() => {
            return;
          }}
          layerProps={{
            hostId: 'msla-layer-host',
          }}
          onDismiss={() => {
            toggleIsCalloutVisible();
          }}
          styles={calloutStyles}
        >
          <TokenPickerPivot selectedKey={selectedKey} selectKey={handleSelectKey} hideExpressions={false} />
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
            tokenGroup={(selectedKey === TokenPickerMode.TOKEN ? filteredTokenGroup : tokenGroup) ?? []}
            expressionGroup={expressionGroup ?? []}
            expressionEditorRef={expressionEditorRef}
            selectedKey={selectedKey}
            searchQuery={searchQuery}
            fullScreen={false}
            expression={expression}
            setExpression={setExpression}
            getValueSegmentFromToken={getValueSegmentFromToken}
            noDynamicContent={!isDynamicContentAvailable(filteredTokenGroup ?? [])}
            expressionEditorCurrentHeight={expressionEditorCurrentHeight}
          />
          <TokenPickerFooter
            tokenGroup={tokenGroup ?? []}
            expression={expression}
            expressionToBeUpdated={expressionToBeUpdated}
            getValueSegmentFromToken={getValueSegmentFromToken}
            setExpressionEditorError={setExpressionEditorError}
          />
        </Callout>
      )}
    </>
  );
}
