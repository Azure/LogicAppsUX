import { TokenPickerMode } from '..';
import type { ValueSegment } from '../../editor';
import type { ExpressionEditorEvent } from '../../expressioneditor';
import type { TokenGroup } from '@microsoft/logic-apps-shared';
import { TokenPickerNoDynamicContent } from './tokenpickernodynamiccontent';
import { TokenPickerNoMatches } from './tokenpickernomatches';
import type { GetValueSegmentHandler } from './tokenpickeroption';
import { TokenPickerOptions } from './tokenpickeroption';
import type { editor } from 'monaco-editor';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

export interface TokenPickerBaseProps {
  selectedMode: TokenPickerMode;
  searchQuery: string;
  expressionEditorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  expression: ExpressionEditorEvent;
  setExpression: Dispatch<SetStateAction<ExpressionEditorEvent>>;
  getValueSegmentFromToken: GetValueSegmentHandler;
  tokenClickedCallback?: (token: ValueSegment) => void;
}
interface TokenPickerSectionProps extends TokenPickerBaseProps {
  tokenGroup: TokenGroup[];
  expressionGroup: TokenGroup[];
  fullScreen: boolean;
  noDynamicContent: boolean;
  expressionEditorCurrentHeight: number;
  calloutMaxHeight?: number;
}

export const TokenPickerSection = ({
  selectedMode,
  tokenGroup,
  expressionGroup,
  searchQuery,
  noDynamicContent,
  ...tokenPickerBaseProps
}: TokenPickerSectionProps): JSX.Element => {
  const [dynamicTokenLength, setDynamicTokenLength] = useState(new Array<number>(tokenGroup.length));
  const [expressionTokenLength, setExpressionTokenLength] = useState(new Array<number>(expressionGroup.length));
  const [noItems, setNoItems] = useState(false);

  useEffect(() => {
    if (selectedMode === TokenPickerMode.TOKEN_EXPRESSION || selectedMode === TokenPickerMode.TOKEN) {
      setNoItems(dynamicTokenLength.reduce((sum, a) => sum + a, 0) === 0);
    } else {
      setNoItems(expressionTokenLength.reduce((sum, a) => sum + a, 0) === 0);
    }
  }, [dynamicTokenLength, expressionTokenLength, searchQuery, selectedMode]);

  return (
    <div className="msla-token-picker-sections">
      {searchQuery && noItems ? <TokenPickerNoMatches /> : null}
      {noDynamicContent && (selectedMode === TokenPickerMode.TOKEN_EXPRESSION || selectedMode === TokenPickerMode.TOKEN) ? (
        <TokenPickerNoDynamicContent />
      ) : (
        (selectedMode === TokenPickerMode.TOKEN_EXPRESSION || selectedMode === TokenPickerMode.TOKEN ? tokenGroup : expressionGroup).map(
          (section, i) => {
            if (section.tokens.length > 0) {
              return (
                <div key={`token-picker-section-${i}`} className={'msla-token-picker-section'}>
                  <TokenPickerOptions
                    section={section}
                    index={i}
                    setTokenLength={selectedMode === TokenPickerMode.EXPRESSION ? setExpressionTokenLength : setDynamicTokenLength}
                    selectedMode={selectedMode}
                    searchQuery={searchQuery}
                    {...tokenPickerBaseProps}
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
