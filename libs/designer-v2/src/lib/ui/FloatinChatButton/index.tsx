import { useIntl } from 'react-intl';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { Button, Dialog, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger } from '@fluentui/react-components';

import { bundleIcon, ChatFilled, ChatRegular } from '@fluentui/react-icons';
import type { AgentURL } from '@microsoft/logic-apps-shared';
import { WorkflowService } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';

const ChatIcon = bundleIcon(ChatFilled, ChatRegular);

export const useAgentUrl = (): UseQueryResult<AgentURL> => {
  return useQuery(
    ['agenUrl'],
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

export const FloatinChatButton = () => {
  const intl = useIntl();
  const { isLoading, data } = useAgentUrl();

  const buttonCommonProps: any = {
    appearance: 'primary',
    shape: 'circular',
    size: 'large',
  };

  const runText = intl.formatMessage({
    defaultMessage: 'Chat',
    id: '9VbsXx',
    description: 'Chat button text',
  });

  const chatContent = useMemo(() => {
    if (isLoading) {
      return;
    }
    return (
      <iframe
        src={`${data?.chatUrl}?apiKey=${data?.queryParams?.apiKey}`}
        title="Telecom Agents Chat"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    );
  }, [isLoading, data]);

  return (
    <Dialog modalType="non-modal" surfaceMotion={null}>
      <DialogTrigger disableButtonEnhancement>
        <Button {...buttonCommonProps} icon={<ChatIcon />}>
          {runText}
        </Button>
      </DialogTrigger>
      <DialogSurface style={{ width: '70vw', maxWidth: '70vw' }}>
        <DialogBody>
          <DialogTitle>Chat</DialogTitle>
          <DialogContent style={{ height: '70vh', padding: 0 }}>{chatContent}</DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
