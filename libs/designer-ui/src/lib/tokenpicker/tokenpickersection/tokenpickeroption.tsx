import type { OutputToken } from '..';
import { ValueSegmentType } from '../../editor';
import { INSERT_TOKEN_NODE } from '../../editor/base/plugins/InsertTokenNode';
import type { TokenGroup } from '../models/token';
import { useBoolean } from '@fluentui/react-hooks';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { guid } from '@microsoft-logic-apps/utils';
import Fuse from 'fuse.js';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

interface TokenPickerOptionsProps {
  section: TokenGroup;
  searchQuery: string;
  index: number;
  setTokenLength: Dispatch<SetStateAction<number[]>>;
}
export const TokenPickerOptions = ({ section, searchQuery, index, setTokenLength }: TokenPickerOptionsProps): JSX.Element => {
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

  const handleCreateToken = (token: OutputToken) => {
    editor.dispatchCommand(INSERT_TOKEN_NODE, {
      brandColor: token.brandColor,
      description: token.description,
      title: token.title,
      icon: token.icon ? `url("${token.icon}")` : 'url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")',
      data: {
        id: guid(),
        type: ValueSegmentType.TOKEN,
        value: token.title,
        token: { ...token, tokenType: token.outputInfo.type },
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
                  onClick={() => handleCreateToken(token)}
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
