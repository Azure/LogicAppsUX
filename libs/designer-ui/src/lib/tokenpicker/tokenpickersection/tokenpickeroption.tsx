import type { OutputToken } from '..';
import { TokenPickerMode } from '../';
import type { ValueSegment } from '../../editor';
// import { TokenType } from '../../editor';
import { INSERT_TOKEN_NODE } from '../../editor/base/plugins/InsertTokenNode';
import { SINGLE_VALUE_SEGMENT } from '../../editor/base/plugins/SingleValueSegment';
import type { ExpressionEditorEvent } from '../../expressioneditor';
import { convertUIElementNameToAutomationId } from '../../utils';
import type { Token, TokenGroup } from '../models/token';
import { Icon } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import Fuse from 'fuse.js';
import type { LexicalEditor } from 'lexical';
import type { editor } from 'monaco-editor';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export type GetValueSegmentHandler = (tokenProps: OutputToken, addImplicitForeach: boolean) => Promise<ValueSegment>;
interface TokenPickerOptionsProps {
  selectedKey: TokenPickerMode;
  section: TokenGroup;
  searchQuery: string;
  index: number;
  expressionEditorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  expression: ExpressionEditorEvent;
  setTokenLength: Dispatch<SetStateAction<number[]>>;
  setExpression: Dispatch<SetStateAction<ExpressionEditorEvent>>;
  getValueSegmentFromToken: GetValueSegmentHandler;
  tokenClickedCallback?: (token: ValueSegment) => void;
}
export const TokenPickerOptions = ({
  selectedKey,
  section,
  searchQuery,
  index,
  expressionEditorRef,
  expression,
  setExpression,
  setTokenLength,
  getValueSegmentFromToken,
  tokenClickedCallback,
}: TokenPickerOptionsProps): JSX.Element => {
  const intl = useIntl();
  let editor: LexicalEditor | null;
  try {
    [editor] = useLexicalComposerContext();
  } catch {
    editor = null;
  }
  const [moreOptions, { toggle: toggleMoreOptions }] = useBoolean(true);
  const [filteredTokens, setFilteredTokens] = useState(section.tokens);

  useEffect(() => {
    let tokens: Token[];
    if (searchQuery) {
      const query = searchQuery.trim();
      const fuse = new Fuse(section.tokens, { keys: ['description', 'title'], threshold: 0.2 });
      tokens = fuse.search(query).map((token) => token.item);
      setFilteredTokens(tokens);
    }
    setTokenLength((prevTokens) => {
      const newTokens = prevTokens;
      newTokens[index] = tokens?.length ?? section.tokens.length;
      return newTokens;
    });
  }, [index, searchQuery, section.tokens, setTokenLength]);

  const buttonTextMore = intl.formatMessage({
    defaultMessage: 'See More',
    description: 'Click to view more token options',
  });

  const buttonTextLess = intl.formatMessage({
    defaultMessage: 'See Less',
    description: 'Click to view less token options',
  });

  const handleMoreLess = () => {
    toggleMoreOptions();
  };

  const handleTokenClicked = (token: OutputToken) => {
    if (selectedKey === TokenPickerMode.TOKEN) {
      handleCreateToken(token);
    } else if (selectedKey === TokenPickerMode.EXPRESSION) {
      handleExpressionClicked(token);
    } else if (selectedKey === TokenPickerMode.TOKEN_EXPRESSION) {
      handleTokenExpressionClicked(token);
    }
  };

  const handleTokenExpressionClicked = async (token: OutputToken) => {
    const segment = await getValueSegmentFromToken(token, !tokenClickedCallback);
    const expression = segment.value ?? token.value ?? '';
    insertExpressionText(expression, 0);
  };

  const handleExpressionClicked = (token: OutputToken) => {
    const expression = token.key;
    insertExpressionText(`${expression}()`, -1);
  };

  const insertExpressionText = (text: string, caretOffset: number): void => {
    if (expressionEditorRef.current) {
      // gets the original expression
      const oldExpression = expressionEditorRef.current.getValue();
      // gets the line number of the current selection
      const selectionLineNumber = expressionEditorRef.current.getPosition()?.lineNumber ?? 1;
      // gets the line of the current selection and replaces the text with the new expression
      const splitOldExpression = oldExpression.split('\r\n');
      const oldExpressionLineNumber = splitOldExpression[selectionLineNumber - 1];
      const beforeSelection = oldExpressionLineNumber.substring(0, expression.selectionStart);
      const afterSelection = oldExpressionLineNumber.substring(expression.selectionEnd);
      const newExpressionLineNumber = `${beforeSelection}${text}${afterSelection}`;
      splitOldExpression[selectionLineNumber - 1] = newExpressionLineNumber;

      // updates the split text and updates the new expression and selection
      const newExpression = splitOldExpression.join('\r\n');
      const newSelection = newExpression.length - afterSelection.length + caretOffset;
      setExpression({ value: newExpression, selectionStart: newSelection, selectionEnd: newSelection });

      setTimeout(() => {
        expressionEditorRef.current?.setValue(newExpression);
        expressionEditorRef.current?.setSelection({
          startLineNumber: selectionLineNumber,
          startColumn: newSelection + 1,
          endLineNumber: selectionLineNumber,
          endColumn: newSelection + 1,
        });
        expressionEditorRef.current?.focus();
      });
    }
  };

  const handleCreateToken = async (token: OutputToken) => {
    const { brandColor, icon, title, description, value } = token;
    const segment = await getValueSegmentFromToken(token, !tokenClickedCallback);
    if (tokenClickedCallback) {
      tokenClickedCallback(segment);
    } else {
      editor?.dispatchCommand(SINGLE_VALUE_SEGMENT, true);
      editor?.dispatchCommand(INSERT_TOKEN_NODE, {
        brandColor,
        description,
        title,
        icon,
        value,
        data: segment,
      });
    }
  };

  const getSectionIcon = (): string | undefined => {
    return section?.tokens[0]?.icon;
  };

  const getSectionSecurity = (): boolean => {
    return section?.tokens[0]?.outputInfo.isSecure ?? false;
  };

  const getSectionBrandColor = (): string => {
    return section?.tokens[0]?.brandColor ?? '#e8eae7';
  };

  return (
    <>
      {(searchQuery && filteredTokens.length > 0) || !searchQuery ? (
        <>
          <div className="msla-token-picker-section-header" style={{ backgroundColor: setOpacity(getSectionBrandColor(), 0.1) }}>
            <img src={getSectionIcon()} alt="token icon" />
            {getSectionSecurity() ? (
              <div className="msla-token-picker-secure-token">
                <Icon iconName="LockSolid" />
              </div>
            ) : null}
            <span> {section.label}</span>
            {searchQuery || !hasAdvanced(section.tokens) ? null : (
              <button
                className="msla-token-picker-section-header-button"
                onClick={handleMoreLess}
                data-automation-id={`msla-token-picker-section-header-button-${convertUIElementNameToAutomationId(section.label)}`}
              >
                <span> {moreOptions ? buttonTextMore : buttonTextLess}</span>
              </button>
            )}
          </div>
          <div className="msla-token-picker-section-options">
            {(!searchQuery ? section.tokens : filteredTokens).map((token, j) => {
              if (!token.isAdvanced || !moreOptions || searchQuery) {
                return (
                  <button
                    className="msla-token-picker-section-option"
                    data-automation-id={`msla-token-picker-section-option-${j}`}
                    key={`token-picker-option-${j}`}
                    onClick={() => handleTokenClicked(token)}
                  >
                    <div className="msla-token-picker-section-option-text">
                      <div className="msla-token-picker-option-inner">
                        <div className="msla-token-picker-option-title">{token.title}</div>
                        <div className="msla-token-picker-option-description" title={token.description}>
                          {token.description}
                        </div>
                      </div>
                      {/* {token.type && token.outputInfo?.type !== TokenType.FX ? (
                        <div className="msla-token-picker-option-type">{token.type}</div>
                      ) : null} */}
                    </div>
                  </button>
                );
              }
              return null;
            })}
          </div>
        </>
      ) : null}
    </>
  );
};
function hasAdvanced(tokens: OutputToken[]): boolean {
  return tokens.some((token) => token.isAdvanced);
}

const setOpacity = (hex: string, alpha: number) =>
  `${hex}${Math.floor(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
