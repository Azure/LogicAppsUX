import { Button, Tooltip } from '@fluentui/react-components';
import { Window24Regular } from '@fluentui/react-icons';
import { forwardRef } from 'react';
import { useIntl } from 'react-intl';

export interface AgentUrlButtonProps {
  url: string;
  onOpen: () => void;
}

export const AgentUrlButton = forwardRef<HTMLButtonElement, AgentUrlButtonProps>(({ url, onOpen }, ref) => {
  const intl = useIntl();

  const DISPLAY_TEXT_OPEN_POPUP = intl.formatMessage({
    defaultMessage: 'Open in popup',
    id: 'l9TY/4',
    description: 'ARIA label and tooltip text for the popup button',
  });

  if (!url) {
    return null;
  }

  return (
    <Tooltip content={DISPLAY_TEXT_OPEN_POPUP} relationship="label">
      <Button
        ref={ref}
        aria-label={DISPLAY_TEXT_OPEN_POPUP}
        icon={<Window24Regular />}
        appearance="transparent"
        size="small"
        onClick={onOpen}
      />
    </Tooltip>
  );
});

AgentUrlButton.displayName = 'AgentUrlButton';
