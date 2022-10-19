import type { ValueSegment } from '../../editor';
import type { ExpressionEditorEvent } from '../../expressioneditor';
import type { TokenGroup } from '../models/token';
import { TokenPickerMode } from '../tokenpickerpivot';
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
  editMode: boolean;
  isDynamicContentAvailable: boolean;
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
  editMode,
  isDynamicContentAvailable,
  setExpression,
  getValueSegmentFromToken,
  tokenClickedCallback,
}: TokenPickerSectionProps): JSX.Element => {
  const [tokenLength, setTokenLength] = useState(new Array<number>(tokenGroup.length));
  const [noItems, setNoItems] = useState(false);

  useEffect(() => {
    setNoItems(tokenLength.reduce((sum, a) => sum + a, 0) === 0);
  }, [searchQuery, tokenLength]);

  return (
    <div className="msla-token-picker-sections">
      {isDynamicContentAvailable || selectedKey === TokenPickerMode.EXPRESSION ? (
        <>
          {searchQuery ? <TokenPickerNoMatches noItems={noItems} /> : null}
          {(selectedKey === TokenPickerMode.TOKEN ? tokenGroup : expressionGroup).map((section, i) => {
            if (section.tokens.length > 0) {
              return (
                <div key={`token-picker-section-${i}`} className={'msla-token-picker-section'}>
                  <TokenPickerOptions
                    selectedKey={selectedKey}
                    section={section}
                    searchQuery={searchQuery}
                    index={i}
                    setTokenLength={setTokenLength}
                    editMode={editMode}
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
          })}
        </>
      ) : (
        <TokenPickerNoDynamicContent />
      )}
    </div>
  );
};
