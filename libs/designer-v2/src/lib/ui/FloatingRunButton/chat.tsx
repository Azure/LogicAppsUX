import { useIntl } from 'react-intl';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Spinner,
  tokens,
} from '@fluentui/react-components';
import type { ButtonProps } from '@fluentui/react-components';

import { bundleIcon, Chat24Filled, Chat24Regular, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import type { AgentURL } from '@microsoft/logic-apps-shared';
import { WorkflowService } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';

const ChatIcon = bundleIcon(Chat24Filled, Chat24Regular);
const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const useAgentUrl = (): UseQueryResult<AgentURL> => {
  return useQuery(
    ['agentUrl'],
    async () => {
      return WorkflowService().getAgentUrl?.();
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

export type ChatButtonProps = ButtonProps & {
  isDarkMode: boolean;
  isDraftMode?: boolean;
  siteResourceId?: string;
  workflowName?: string;
};

export const ChatButton = (props: ChatButtonProps) => {
  const intl = useIntl();
  const { isLoading, data } = useAgentUrl();
  const { isDarkMode, isDraftMode, workflowName, ...buttonProps } = props;

  const IntlText = useMemo(
    () => ({
      CHAT_TEXT: intl.formatMessage({
        defaultMessage: 'Chat',
        id: '9VbsXx',
        description: 'Chat button text',
      }),
      LOADING: intl.formatMessage({
        defaultMessage: 'Loading',
        id: 'WgJsL1',
        description: 'Loading text',
      }),
      TITLE: intl.formatMessage({
        defaultMessage: 'Agent chat',
        id: 'Xj/wPS',
        description: 'Agent chat title',
      }),
    }),
    [intl]
  );

  const chatContent = useMemo(() => {
    if (isLoading) {
      return <Spinner size="medium" label={IntlText.LOADING} />;
    }

    const agentChatUrl = data?.chatUrl;
    let draftAgentCard = '';

    if (agentChatUrl && isDraftMode) {
      const url = new URL(agentChatUrl);
      draftAgentCard =
        url.origin && workflowName
          ? `${url.origin}/runtime/webhooks/workflow/scaleUnits/prod-00/agents/${workflowName}/draft/.well-known/agent-card.json`
          : '';
    }

    return (
      <iframe
        src={`${agentChatUrl}?apiKey=${data?.queryParams?.apiKey}${isDarkMode ? '&mode=dark' : ''}${draftAgentCard ? `&agentCard=${draftAgentCard}` : ''}`}
        title={IntlText.TITLE}
        style={{ width: '100%', height: '99%', border: 'none', borderRadius: tokens.borderRadiusXLarge }}
      />
    );
  }, [isLoading, data?.chatUrl, data?.queryParams?.apiKey, isDraftMode, isDarkMode, IntlText.TITLE, IntlText.LOADING, workflowName]);

  return (
    <Dialog modalType="non-modal" surfaceMotion={null}>
      <DialogTrigger disableButtonEnhancement>
        <Button {...buttonProps} icon={<ChatIcon />}>
          {IntlText.CHAT_TEXT}
        </Button>
      </DialogTrigger>
      <DialogSurface style={{ width: '70vw', maxWidth: '70vw' }}>
        <DialogBody>
          <DialogTitle
            action={
              <DialogTrigger action="close">
                <Button appearance="subtle" aria-label="close" icon={<CloseIcon />} />
              </DialogTrigger>
            }
          />
          <DialogContent style={{ height: '70vh', padding: 0 }}>{chatContent}</DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
