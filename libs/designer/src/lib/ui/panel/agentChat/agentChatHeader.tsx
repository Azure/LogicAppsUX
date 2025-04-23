import { Button, Subtitle1 } from '@fluentui/react-components';
import { ChevronDoubleRightFilled } from '@fluentui/react-icons';
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

  const intlText = useMemo(() => {
    return {
      collapseButtonAriaLabel: intl.formatMessage({
        defaultMessage: 'Collapse chat panel',
        id: 's1j0TY',
        description: 'Collapse button aria label',
      }),
    };
  }, [intl]);

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        justifyContent: 'center',
        padding: '10px',
        borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}`,
      }}
    >
      <Subtitle1>{title}</Subtitle1>
      <Button
        id="msla-agent-chat-header-collapse"
        appearance="subtle"
        icon={<ChevronDoubleRightFilled />}
        aria-label={intlText.collapseButtonAriaLabel}
        onClick={toggleCollapse}
        data-automation-id="msla-agent-chat-header-collapse"
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
    </div>
  );
};
