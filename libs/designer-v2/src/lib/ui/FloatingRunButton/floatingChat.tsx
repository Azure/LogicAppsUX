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

import { bundleIcon, Chat24Filled, Chat24Regular } from '@fluentui/react-icons';
import type { AgentURL } from '@microsoft/logic-apps-shared';
import { WorkflowService } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';

const ChatIcon = bundleIcon(Chat24Filled, Chat24Regular);

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

export const FloatinChatButton = (buttonCommonProps: any) => {
  const intl = useIntl();
  const { isLoading, data } = useAgentUrl();

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
    return (
      <iframe
        src={`${data?.chatUrl}?apiKey=${data?.queryParams?.apiKey}`}
        title={IntlText.TITLE}
        style={{ width: '100%', height: '99%', border: 'none', borderRadius: tokens.borderRadiusXLarge }}
      />
    );
  }, [isLoading, data, IntlText]);

  return (
    <Dialog modalType="non-modal" surfaceMotion={null}>
      <DialogTrigger disableButtonEnhancement>
        <Button {...buttonCommonProps} icon={<ChatIcon />}>
          {IntlText.CHAT_TEXT}
        </Button>
      </DialogTrigger>
      <DialogSurface style={{ width: '70vw', maxWidth: '70vw' }}>
        <DialogBody>
          <DialogTitle />
          <DialogContent style={{ height: '70vh', padding: 0 }}>{chatContent}</DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
