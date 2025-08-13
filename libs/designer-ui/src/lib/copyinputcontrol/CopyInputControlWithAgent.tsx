import * as React from 'react';
import { Tooltip } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import type { CopyInputControlProps } from './index';
import { CopyInputControl } from './index';
import { AgentUrlViewer, AgentUrlButton } from './AgentUrlViewer';

export interface CopyInputControlWithAgentProps extends Omit<CopyInputControlProps, 'children'> {
  /**
   * Whether to show the agent URL viewer button and modal
   */
  showAgentViewer?: boolean;
}

export const CopyInputControlWithAgent = React.forwardRef<Pick<HTMLElement, 'focus' | 'scrollIntoView'>, CopyInputControlWithAgentProps>(
  ({ showAgentViewer = false, text, ...props }, ref) => {
    const [isAgentViewerOpen, setIsAgentViewerOpen] = React.useState(false);
    const intl = useIntl();

    const DISPLAY_TEXT_OPEN_POPUP = intl.formatMessage({
      defaultMessage: 'Open in popup',
      id: 'l9TY/4',
      description: 'ARIA label and tooltip text for the popup button',
    });

    const handleAgentViewerOpen = () => {
      setIsAgentViewerOpen(true);
    };

    const handleAgentViewerClose = () => {
      setIsAgentViewerOpen(false);
    };

    return (
      <>
        <CopyInputControl ref={ref} text={text} {...props}>
          {showAgentViewer && text ? (
            <Tooltip content={DISPLAY_TEXT_OPEN_POPUP} relationship="label">
              <AgentUrlButton url={text} onOpen={handleAgentViewerOpen} />
            </Tooltip>
          ) : null}
        </CopyInputControl>
        {showAgentViewer && text ? <AgentUrlViewer url={text} isOpen={isAgentViewerOpen} onClose={handleAgentViewerClose} /> : null}
      </>
    );
  }
);

CopyInputControlWithAgent.displayName = 'CopyInputControlWithAgent';
