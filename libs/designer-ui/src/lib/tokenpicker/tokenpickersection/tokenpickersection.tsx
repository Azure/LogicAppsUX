import { getWindowDimensions, TokenPickerMode } from '..';
import type { ValueSegment } from '../../editor';
import type { ExpressionEditorEvent } from '../../expressioneditor';
import type { TokenGroup } from '../models/token';
import { TokenPickerNoDynamicContent } from './tokenpickernodynamiccontent';
import { TokenPickerNoMatches } from './tokenpickernomatches';
import type { GetValueSegmentHandler } from './tokenpickeroption';
import { TokenPickerOptions } from './tokenpickeroption';
import type { editor } from 'monaco-editor';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

interface TokenPickerSectionProps {
  selectedKey: TokenPickerMode;
  tokenGroup: TokenGroup[];
  expressionGroup: TokenGroup[];
  searchQuery: string;
  expressionEditorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  expression: ExpressionEditorEvent;
  fullScreen: boolean;
  noDynamicContent: boolean;
  expressionEditorCurrentHeight: number;
  setExpression: Dispatch<SetStateAction<ExpressionEditorEvent>>;
  getValueSegmentFromToken: GetValueSegmentHandler;
  tokenClickedCallback?: (token: ValueSegment) => void;
}
export const TokenPickerSection = ({
  selectedKey,
  tokenGroup,
  expressionGroup,
  searchQuery,
  expressionEditorRef,
  expression,
  fullScreen,
  noDynamicContent,
  expressionEditorCurrentHeight,
  setExpression,
  getValueSegmentFromToken,
  tokenClickedCallback,
}: TokenPickerSectionProps): JSX.Element => {
  const [dynamicTokenLength, setDynamicTokenLength] = useState(new Array<number>(tokenGroup.length));
  const [expressionTokenLength, setExpressionTokenLength] = useState(new Array<number>(expressionGroup.length));
  const [noItems, setNoItems] = useState(false);

  useEffect(() => {
    if (selectedKey === TokenPickerMode.TOKEN_EXPRESSION || selectedKey === TokenPickerMode.TOKEN) {
      setNoItems(dynamicTokenLength.reduce((sum, a) => sum + a, 0) === 0);
    } else {
      setNoItems(expressionTokenLength.reduce((sum, a) => sum + a, 0) === 0);
    }
  }, [dynamicTokenLength, expressionTokenLength, searchQuery, selectedKey]);

  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      className="msla-token-picker-sections"
      style={{
        maxHeight: fullScreen
          ? windowDimensions.height - (expressionEditorCurrentHeight + 287)
          : Math.min(windowDimensions.height - (expressionEditorCurrentHeight + 197), 540),
      }}
    >
      {searchQuery && noItems ? <TokenPickerNoMatches /> : null}
      {noDynamicContent && (selectedKey === TokenPickerMode.TOKEN_EXPRESSION || selectedKey === TokenPickerMode.TOKEN) ? (
        <TokenPickerNoDynamicContent />
      ) : (
        (selectedKey === TokenPickerMode.TOKEN_EXPRESSION || selectedKey === TokenPickerMode.TOKEN ? tokenGroup : expressionGroup).map(
          (section, i) => {
            if (section.tokens.length > 0) {
              return (
                <div key={`token-picker-section-${i}`} className={'msla-token-picker-section'}>
                  <TokenPickerOptions
                    selectedKey={selectedKey}
                    section={section}
                    searchQuery={searchQuery}
                    index={i}
                    setTokenLength={selectedKey === TokenPickerMode.EXPRESSION ? setExpressionTokenLength : setDynamicTokenLength}
                    expressionEditorRef={expressionEditorRef}
                    expression={expression}
                    setExpression={setExpression}
                    getValueSegmentFromToken={getValueSegmentFromToken}
                    tokenClickedCallback={tokenClickedCallback}
                  />
                </div>
              );
            }
            return null;
          }
        )
      )}
    </div>
  );
};
