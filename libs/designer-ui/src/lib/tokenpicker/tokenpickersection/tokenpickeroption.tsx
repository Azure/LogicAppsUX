import type { OutputToken } from '..';
import { ValueSegmentType } from '../../editor';
import { INSERT_TOKEN_NODE } from '../../editor/base/plugins/InsertTokenNode';
import type { ExpressionEditorEvent } from '../../expressioneditor';
import type { TokenGroup } from '../models/token';
import { TokenPickerMode } from '../tokenpickerpivot';
import { useBoolean } from '@fluentui/react-hooks';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { guid } from '@microsoft-logic-apps/utils';
import Fuse from 'fuse.js';
import type { editor } from 'monaco-editor';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

interface TokenPickerOptionsProps {
  selectedKey: TokenPickerMode;
  section: TokenGroup;
  searchQuery: string;
  index: number;
  editMode: boolean;
  expressionEditorRef: MutableRefObject<editor.IStandaloneCodeEditor | null>;
  expression: ExpressionEditorEvent;
  setTokenLength: Dispatch<SetStateAction<number[]>>;
  setExpression: Dispatch<SetStateAction<ExpressionEditorEvent>>;
}
export const TokenPickerOptions = ({
  selectedKey,
  section,
  searchQuery,
  index,
  editMode,
  expressionEditorRef,
  setTokenLength,
  expression,
  setExpression,
}: TokenPickerOptionsProps): JSX.Element => {
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const [moreOptions, { toggle: toggleMoreOptions }] = useBoolean(true);
  const [filteredTokens, setFilteredTokens] = useState(section.tokens);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.trim();
      const fuse = new Fuse(section.tokens, { keys: ['description', 'title'], threshold: 0.2 });
      const tokens = fuse.search(query).map((token) => token.item);
      setFilteredTokens(tokens);
      setTokenLength((prevTokens) => {
        const newTokens = prevTokens;
        newTokens[index] = tokens.length;
        return newTokens;
      });
    } else {
      setTokenLength((prevTokens) => {
        const newTokens = prevTokens;
        newTokens[index] = section.tokens.length;
        return newTokens;
      });
    }
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
    if (editMode) {
      if (selectedKey === TokenPickerMode.TOKEN) {
        handleExpressionTokenMode(token);
      } else if (selectedKey === TokenPickerMode.EXPRESSION) {
        handleExpressionTokenModeToken(token);
      }
    } else {
      handleCreateToken(token);
    }
  };

  const handleExpressionTokenMode = (token: OutputToken) => {
    const expression = token.description ?? '';
    insertExpressionText(expression, 0);
  };
  const handleExpressionTokenModeToken = (token: OutputToken) => {
    const expression = token.key;
    insertExpressionText(`${expression}()`, -1);
  };

  const insertExpressionText = (text: string, caretOffset: number): void => {
    if (expressionEditorRef.current) {
      const oldExpression = expressionEditorRef.current.getValue();
      const beforeSelection = oldExpression.substring(0, expression.selectionStart);
      const afterSelection = oldExpression.substring(expression.selectionEnd);
      const newExpression = `${beforeSelection}${text}${afterSelection}`;
      const newSelection = newExpression.length - afterSelection.length + caretOffset;
      setExpression({ value: newExpression, selectionStart: newSelection, selectionEnd: newSelection });

      setTimeout(() => {
        expressionEditorRef.current?.setValue(newExpression);
        expressionEditorRef.current?.setSelection({
          startLineNumber: 1,
          startColumn: newSelection + 1,
          endLineNumber: 1,
          endColumn: newSelection + 1,
        });
        expressionEditorRef.current?.focus();
      });
    }
  };

  const handleCreateToken = (token: OutputToken) => {
    editor.dispatchCommand(INSERT_TOKEN_NODE, {
      brandColor: token.brandColor,
      description: token.description ?? token.key,
      title: token.title,
      icon: token.icon ?? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      data: {
        id: guid(),
        type: ValueSegmentType.TOKEN,
        value: token.title,
        token: { ...token, tokenType: token.outputInfo.type, description: token.description ?? '' },
      },
    });
  };

  return (
    <>
      {(searchQuery && filteredTokens.length > 0) || !searchQuery ? (
        <>
          <div className="msla-token-picker-section-header">
            <span> {section.label}</span>
            {searchQuery ? null : (
              <button className="msla-token-picker-section-header-button" onClick={handleMoreLess}>
                <span> {moreOptions ? buttonTextMore : buttonTextLess}</span>
              </button>
            )}
          </div>
          <div className="msla-token-picker-section-options">
            {(!searchQuery ? section.tokens : filteredTokens).map((token, j) => {
              return (
                <button
                  className="msla-token-picker-section-option"
                  key={`token-picker-option-${j}`}
                  onClick={() => handleTokenClicked(token)}
                >
                  <img src={token.icon} alt="" />
                  <div className="msla-token-picker-section-option-text">
                    <div className="msla-token-picker-option-inner">
                      <div className="msla-token-picker-option-title">{token.title}</div>
                      <div className="msla-token-picker-option-description">{token.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </>
  );
};
