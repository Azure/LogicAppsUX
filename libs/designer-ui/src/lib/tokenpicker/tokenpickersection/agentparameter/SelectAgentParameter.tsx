import { useTheme } from '@fluentui/react';
import type { TokenGroup } from '@microsoft/logic-apps-shared';
import constants from '../../../constants';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { AgentParameterIcon, type OutputToken } from '../..';
import Fuse from 'fuse.js';
import { NoAgentParameters } from './NoAgentParameter';
import { Button, SearchBox } from '@fluentui/react-components';
import { AddFilled, AddRegular, bundleIcon } from '@fluentui/react-icons';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { GetValueSegmentHandler } from '../tokenpickeroption';
import { SINGLE_VALUE_SEGMENT } from '../../../editor/base/plugins/SingleValueSegment';
import { INSERT_TOKEN_NODE } from '../../../editor/base/plugins/InsertTokenNode';

const AddIcon = bundleIcon(AddFilled, AddRegular);

interface SelectAgentParameterProps {
  agentParameters?: TokenGroup;
  onCreateAgentParameter?: () => void;
  getValueSegmentFromToken: GetValueSegmentHandler;
}

export const SelectAgentParameter = ({ agentParameters, onCreateAgentParameter, getValueSegmentFromToken }: SelectAgentParameterProps) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { isInverted } = useTheme();
  const [editor] = useLexicalComposerContext();

  const searchPlaceHolderText = intl.formatMessage({
    defaultMessage: 'Search',
    id: 'Mc6ITJ',
    description: 'Placeholder text to search token picker',
  });

  const agentParameterLabel = intl.formatMessage({
    defaultMessage: 'Agent Parameters',
    id: '0r+ujR',
    description: 'Agent Parameters label',
  });

  const createAgentParameterButtonLabel = intl.formatMessage({
    defaultMessage: 'Create new',
    id: 'FZfFAA',
    description: 'Create new agent parameter button label',
  });

  const onAgentParameterClicked = useCallback(
    async (token: OutputToken) => {
      const { brandColor, icon, title, description, value } = token;
      const segment = await getValueSegmentFromToken(token, false);
      console.log(segment);

      editor?.dispatchCommand(SINGLE_VALUE_SEGMENT, true);
      editor?.dispatchCommand(INSERT_TOKEN_NODE, {
        brandColor,
        description,
        title,
        icon,
        value,
        data: segment,
      });
    },
    [editor, getValueSegmentFromToken]
  );

  const fuse = useMemo(
    () =>
      new Fuse(agentParameters?.tokens || [], {
        keys: ['title', 'description'],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [agentParameters?.tokens]
  );

  const filteredTokens = useMemo(
    () => (searchQuery ? fuse.search(searchQuery).map((result) => result.item) : agentParameters?.tokens || []),
    [agentParameters?.tokens, fuse, searchQuery]
  );

  return (
    <div className="msla-tokenpicker-agentparameter-select-container">
      <div className="msla-token-picker-search-container">
        <SearchBox
          className="msla-token-picker-search"
          placeholder={searchPlaceHolderText}
          onChange={(_, data) => {
            setSearchQuery(data.value);
          }}
          data-automation-id="msla-token-picker-search"
          value={searchQuery}
        />
      </div>
      <div
        className="msla-token-picker-section-header"
        style={{
          backgroundColor: isInverted ? constants.AGENT_PARAMETER_SECTION_DARK_COLOR : constants.AGENT_PARAMETER_SECTION_LIGHT_COLOR,
        }}
      >
        <img src={AgentParameterIcon} alt="token icon" />
        <span>{agentParameterLabel}</span>
      </div>
      {filteredTokens.length > 0 ? (
        <ul className="msla-token-picker-section-options" aria-label={agentParameterLabel}>
          {filteredTokens.map((token, j) => (
            <li key={`token-picker-option-li-${j}`}>
              <button
                className="msla-token-picker-section-option"
                data-automation-id={`msla-token-picker-section-option-${j}`}
                onClick={() => onAgentParameterClicked(token)}
              >
                <div className="msla-token-picker-section-option-text">
                  <div className="msla-token-picker-option-inner">
                    <div className="msla-token-picker-option-title">{token.title}</div>
                    <div className="msla-token-picker-option-description" title={token.description}>
                      {token.description}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <NoAgentParameters usingSearch={!!searchQuery} clearSearch={() => setSearchQuery((prev) => (prev ? '' : prev))} />
      )}

      <div className="msla-token-picker-agent-parameter-footer">
        <Button
          onClick={onCreateAgentParameter}
          data-automation-id="create-agent-parameter-button"
          className="msla-create-agent-parameter-button"
          appearance="transparent"
          icon={<AddIcon />}
        >
          {createAgentParameterButtonLabel}
        </Button>
      </div>
    </div>
  );
};
