import type { editor } from 'monaco-editor';
import type { ExpressionEditorEvent } from '../../expressioneditor';
import { ExpressionEditor } from '../../expressioneditor';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TokenPickerMode, getWindowDimensions } from '../../tokenpicker';
import type { IButtonStyles, ICalloutContentStyles, ISearchBox, PivotItem } from '@fluentui/react';
import { Callout, DirectionalHint, SearchBox, IconButton } from '@fluentui/react';
import { TokenPickerPivot } from '../../tokenpicker/tokenpickerpivot';
import { useIntl } from 'react-intl';
import { TokenPickerSection } from '../../tokenpicker/tokenpickersection/tokenpickersection';
import type { GetValueSegmentHandler } from '../../tokenpicker/tokenpickersection/tokenpickeroption';
import type { EditorContentChangedEventArgs } from '../../editor/monaco';
import constants from '../../constants';
import type { TokenGroup } from '@microsoft/logic-apps-shared';

const buttonStyles: IButtonStyles = {
  root: {
    height: '24px',
  },
  rootHovered: {
    backgroundColor: 'transparent',
  },
  rootPressed: {
    backgroundColor: 'transparent',
    color: constants.BRAND_COLOR_LIGHT,
  },
};

export interface ConditionExpressionProps {
  editorId: string;
  labelId: string;
  initialValue: string;
  getValueSegmentFromToken: GetValueSegmentHandler;
  tokenGroup?: TokenGroup[];
  filteredTokenGroup?: TokenGroup[];
  expressionGroup?: TokenGroup[];
  onChange: (value: string) => void;
  isReadOnly: boolean;
}

export function ConditionExpression({
  editorId,
  labelId,
  initialValue,
  filteredTokenGroup,
  tokenGroup,
  expressionGroup,
  getValueSegmentFromToken,
  onChange,
  isReadOnly,
}: ConditionExpressionProps): JSX.Element {
  const intl = useIntl();
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const [expression, setExpression] = useState<ExpressionEditorEvent>({ value: initialValue, selectionStart: 0, selectionEnd: 0 });
  const [isDraggingExpressionEditor, setIsDraggingExpressionEditor] = useState(false);
  const [expressionEditorDragDistance, setExpressionEditorDragDistance] = useState(0);
  const [expressionEditorCurrentHeight, setExpressionEditorCurrentHeight] = useState(windowDimensions.height < 400 ? 50 : 100);
  const [_expressionEditorError, setExpressionEditorError] = useState<string>('');
  const [isCalloutVisible, setIsCalloutVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<TokenPickerMode>(TokenPickerMode.EXPRESSION);

  const searchBoxRef = useRef<ISearchBox | null>(null);
  const expressionEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const tokenPickerPlaceHolderText = intl.formatMessage({
    defaultMessage: 'Search',
    id: 'Mc6ITJ',
    description: 'Placeholder text to search token picker',
  });

  const closeMessage = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'Zg3IjD',
    description: 'Close token picker',
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
    },
    calloutMain: {
      overflow: 'hidden',
    },
  };

  const handleDraggingOut = useCallback(() => {
    if (isDraggingExpressionEditor) {
      setIsDraggingExpressionEditor(false);
    }
  }, [isDraggingExpressionEditor]);

  const handleFocusExpression = useCallback(() => {
    if (!isCalloutVisible) {
      setIsCalloutVisible(true);
    }
  }, [isCalloutVisible]);

  const onContentChanged = (e: EditorContentChangedEventArgs): void => {
    onChange(e.value ?? '');
  };

  const handleCloseTokenPicker = () => {
    setIsCalloutVisible(false);
  };

  return (
    <>
      <div
        id={`condition-expression-${editorId}`}
        onMouseUp={handleDraggingOut}
        onMouseLeave={handleDraggingOut}
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
          onFocus={handleFocusExpression}
          onContentChanged={onContentChanged}
          isReadOnly={isReadOnly}
        />
      </div>
      {isCalloutVisible && !isReadOnly && (
        <Callout
          className="msla-condition-expression-callout"
          role="dialog"
          calloutMaxHeight={400}
          ariaLabelledBy={labelId}
          target={`#condition-expression-${editorId}`}
          isBeakVisible={false}
          directionalHint={DirectionalHint.leftTopEdge}
          onRestoreFocus={() => {
            return;
          }}
          layerProps={{
            hostId: 'msla-layer-host',
          }}
          onDismiss={() => {
            setIsCalloutVisible(false);
          }}
          styles={calloutStyles}
        >
          <div className="msla-token-picker-header">
            <div className="msla-token-picker-header-close" data-automation-id="msla-token-picker-header-close">
              <IconButton
                iconProps={{ iconName: 'Cancel' }}
                title={closeMessage}
                ariaLabel={closeMessage}
                onClick={handleCloseTokenPicker}
                styles={buttonStyles}
              />
            </div>
          </div>
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
            selectedMode={selectedKey}
            searchQuery={searchQuery}
            fullScreen={false}
            expression={expression}
            setExpression={setExpression}
            getValueSegmentFromToken={getValueSegmentFromToken}
            noDynamicContent={!isDynamicContentAvailable(filteredTokenGroup ?? [])}
            expressionEditorCurrentHeight={expressionEditorCurrentHeight}
            calloutMaxHeight={400}
          />
        </Callout>
      )}
    </>
  );
}
