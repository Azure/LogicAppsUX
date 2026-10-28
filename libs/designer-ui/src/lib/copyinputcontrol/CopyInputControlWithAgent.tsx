import * as React from 'react';
import { useIntl } from 'react-intl';
import type { CopyInputControlProps } from './index';
import { CopyInputControl } from './index';
import { AgentUrlViewer } from './AgentUrlViewer';
import type { AgentQueryParams } from '@microsoft/logic-apps-shared';
import { Label } from '../label';
import { Key20Regular } from '@fluentui/react-icons';
import { useCopyInputControlStyles } from './styles';
import { AgentUrlButton } from './AgentUrlButton';
import { isSafeAgentPreviewUrl } from './agentPreviewUrl';

export interface CopyInputControlWithAgentProps extends Omit<CopyInputControlProps, 'children'> {
  /**
   * Whether to show the agent URL viewer button and modal
   */
  showAgentViewer?: boolean;

  queryParams?: AgentQueryParams;
  chatUrl?: string;
}

export const CopyInputControlWithAgent = React.forwardRef<Pick<HTMLElement, 'focus' | 'scrollIntoView'>, CopyInputControlWithAgentProps>(
  ({ showAgentViewer = false, text, queryParams, chatUrl, ...props }, ref) => {
    const [isAgentViewerOpen, setIsAgentViewerOpen] = React.useState(false);
    const intl = useIntl();
    const styles = useCopyInputControlStyles();

    const DISPLAY_TEXT_API_KEY = intl.formatMessage({
      defaultMessage: 'Agent API key (valid for 24 hours)',
      id: 'rDQmGU',
      description: 'Label for API key copyable field',
    });

    const COPY_API_KEY = intl.formatMessage({
      defaultMessage: 'Copy your agent api key',
      id: 'ZIEl3/',
      description: 'Label for API key copy button',
    });

    const handleAgentViewerOpen = React.useCallback(() => {
      // If there are no query params, easy auth is enabled so chat cannot be opened as Iframe in portal
      if (queryParams) {
        // The dialog itself is not a navigation sink -- AgentUrlViewer applies its own
        // destination-safety boundary before its iframe/fallback-popup sinks, and shows the
        // existing error UI when the destination is unsafe. Always allow it to open so that
        // error handling is visible instead of the button silently doing nothing.
        setIsAgentViewerOpen(true);
      } else {
        // This is the only direct navigation sink here: a chatUrl that is absent, malformed, or
        // uses a non-web/executable scheme must never reach window.open, regardless of provenance.
        if (!isSafeAgentPreviewUrl(chatUrl)) {
          return;
        }
        window.open(chatUrl, '_blank', 'noopener,noreferrer');
      }
    }, [chatUrl, queryParams]);

    const handleAgentViewerClose = React.useCallback(() => {
      setIsAgentViewerOpen(false);
    }, []);

    return (
      <>
        <CopyInputControl ref={ref} text={text} {...props}>
          {showAgentViewer && text ? <AgentUrlButton url={text} onOpen={handleAgentViewerOpen} /> : null}
        </CopyInputControl>

        {queryParams?.apiKey ? (
          <div className={styles.apiKeyContainer}>
            <div className={styles.apiKeyHeader}>
              <Key20Regular className={styles.apiKeyIcon} />
              <Label text={DISPLAY_TEXT_API_KEY} />
            </div>
            <CopyInputControl text={queryParams.apiKey} copyButtonLabel={COPY_API_KEY} />
          </div>
        ) : null}
        {showAgentViewer && chatUrl ? (
          <AgentUrlViewer isOpen={isAgentViewerOpen} onClose={handleAgentViewerClose} queryParams={queryParams} url={chatUrl} />
        ) : null}
      </>
    );
  }
);

CopyInputControlWithAgent.displayName = 'CopyInputControlWithAgent';
