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
      defaultMessage: 'API Key',
      id: 'KqqiLm',
      description: 'Label for API key copyable field',
    });

    const COPY_API_KEY = intl.formatMessage({
      defaultMessage: 'Copy API Key',
      id: 'A8xkL1',
      description: 'Label for API key copy button',
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
