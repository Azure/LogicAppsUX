import { Button, Subtitle2 } from '@fluentui/react-components';
import { ArrowClockwise16Regular, ChevronDoubleRight16Filled, Stop16Regular } from '@fluentui/react-icons';
import { useIsDarkMode } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

interface AgentChatHeaderProps {
  title: string;
  toggleCollapse: () => void;
}
export const AgentChatHeader = ({ title, toggleCollapse }: AgentChatHeaderProps) => {
  const intl = useIntl();
  const isDarkMode = useIsDarkMode();

  const intlText = useMemo(
    () => ({
      COLLAPSE_BUTTON_ARIA_LABEL: intl.formatMessage({
        defaultMessage: 'Collapse',
        id: '0RcjSp',
        description: 'Aria label for collapse button',
      }),
      COLLAPSE_BUTTON_TITLE: intl.formatMessage({
        defaultMessage: 'Collapse chat panel',
        id: 'AlWFOS',
        description: 'Collapse button title',
      }),
      REFRESH_BUTTON_ARIA_LABEL: intl.formatMessage({
        defaultMessage: 'Refresh',
        id: 'ddnfTx',
        description: 'Aria label for refresh button',
      }),
      REFRESH_BUTTON_TITLE: intl.formatMessage({
        defaultMessage: 'Refresh chat panel',
        id: '5BGUkr',
        description: 'Refresh button title',
      }),
    }),
    [intl]
  );

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}`,
      }}
    >
      <Subtitle2 style={{ marginLeft: '10px' }}>{title}</Subtitle2>
      <div className="msla-agent-chat-header-buttons">
        <Button
          id="msla-agent-chat-header-stop"
          appearance="subtle"
          icon={<Stop16Regular />}
          aria-label={intlText.COLLAPSE_BUTTON_ARIA_LABEL}
          onClick={toggleCollapse}
          data-automation-id="msla-agent-chat-header-stop"
          title={intlText.COLLAPSE_BUTTON_TITLE}
        />
        <Button
          id="msla-agent-chat-header-refresh"
          appearance="subtle"
          icon={<ArrowClockwise16Regular />}
          aria-label={intlText.REFRESH_BUTTON_ARIA_LABEL}
          onClick={toggleCollapse}
          data-automation-id="msla-agent-chat-header-refresh"
          title={intlText.REFRESH_BUTTON_TITLE}
        />
        <Button
          id="msla-agent-chat-header-collapse"
          appearance="subtle"
          icon={<ChevronDoubleRight16Filled />}
          aria-label={intlText.COLLAPSE_BUTTON_ARIA_LABEL}
          onClick={toggleCollapse}
          data-automation-id="msla-agent-chat-header-collapse"
          title={intlText.COLLAPSE_BUTTON_TITLE}
        />
      </div>
    </div>
  );
};
