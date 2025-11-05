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
  Tooltip,
} from '@fluentui/react-components';
import type { ButtonProps } from '@fluentui/react-components';
import { WorkflowService } from '@microsoft/logic-apps-shared';
import type { AgentURL } from '@microsoft/logic-apps-shared';
import { bundleIcon, Chat24Filled, Chat24Regular, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState } from 'react';

const ChatIcon = bundleIcon(Chat24Filled, Chat24Regular);
const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const useAgentUrl = (props: { isDraftMode?: boolean }): UseQueryResult<AgentURL> => {
  return useQuery(
    ['agentUrl', props.isDraftMode],
    async () => {
      return WorkflowService().getAgentUrl?.(props.isDraftMode);
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
  tooltipText?: string;
  saveWorkflow: () => Promise<void>;
};

export const ChatButton = (props: ChatButtonProps) => {
  const intl = useIntl();
  const { isDarkMode, isDraftMode, saveWorkflow, tooltipText: clientStateTooltipText, ...buttonProps } = props;
  const { isLoading, data } = useAgentUrl({ isDraftMode });
  const [isSaving, setIsSaving] = useState(false);
  const [onDialogOpen, setOnDialogOpen] = useState(false);

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
      DEFAULT_TOOLTIP: intl.formatMessage({
        defaultMessage: 'Click here to chat with your workflow',
        id: 'sBGZCI',
        description: 'Tooltip for chat button',
      }),
      CHAT_IN_AUTHENTICATION_DRAFT: intl.formatMessage(
        {
          defaultMessage:
            'Embedded chat is unavailable with authentication enabled. Publish to access the chat client and click to open in new tab: {url}',
          id: '3MaYXN',
          description: 'Tooltip for chat button',
        },
        {
          url: agentChatUrl,
        }
      ),
      CHAT_IN_AUTHENTICATION_PROD: intl.formatMessage(
        {
          defaultMessage: 'Embedded chat is unavailable with authentication enabled. Click to open in new tab: {url}',
          id: '7rokiZ',
          description: 'Tooltip for chat button',
        },
        {
          url: agentChatUrl,
        }
      ),
    }),
    [intl]
  );

  const agentChatUrl = useMemo(() => data?.chatUrl, [data]);

  const onOpenChange = useCallback(
    async (open?: boolean) => {
      if (open) {
        setIsSaving(true);
        await saveWorkflow();
        setIsSaving(false);
        if (data?.authenticationEnabled && agentChatUrl) {
          window.open(agentChatUrl, '_blank');
          return;
        }
      }

      setOnDialogOpen(!!open);
    },
    [saveWorkflow, data?.authenticationEnabled, agentChatUrl]
  );

  const tooltipText = useMemo(() => {
    if (buttonProps.disabled) {
      return clientStateTooltipText ?? IntlText.DEFAULT_TOOLTIP;
    }

    if (data?.authenticationEnabled && isDraftMode) {
      return IntlText.CHAT_IN_AUTHENTICATION_DRAFT;
    }

    if (data?.authenticationEnabled) {
      return IntlText.CHAT_IN_AUTHENTICATION_PROD;
    }

    return IntlText.DEFAULT_TOOLTIP;
  }, [
    buttonProps.disabled,
    clientStateTooltipText,
    data?.authenticationEnabled,
    isDraftMode,
    IntlText.CHAT_IN_AUTHENTICATION_DRAFT,
    IntlText.CHAT_IN_AUTHENTICATION_PROD,
    IntlText.DEFAULT_TOOLTIP,
  ]);

  const chatContent = useMemo(() => {
    if (isLoading || isSaving) {
      return <Spinner size="medium" label={IntlText.LOADING} />;
    }

    return (
      <iframe
        src={`${agentChatUrl}${agentChatUrl?.includes('?') ? '&' : '?'}apiKey=${data?.queryParams?.apiKey}${isDarkMode ? '&mode=dark' : ''}`}
        title={IntlText.TITLE}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="eager"
        style={{ width: '100%', height: '99%', border: 'none', borderRadius: tokens.borderRadiusXLarge }}
      />
    );
  }, [isLoading, isSaving, agentChatUrl, data?.queryParams?.apiKey, isDarkMode, IntlText.TITLE, IntlText.LOADING]);

  return (
    <Dialog modalType="modal" surfaceMotion={null} open={onDialogOpen} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        <Tooltip content={tooltipText} relationship="label" withArrow={true}>
          <Button {...buttonProps} disabled={buttonProps.disabled || !agentChatUrl || isLoading || isSaving} icon={<ChatIcon />}>
            {IntlText.CHAT_TEXT}
          </Button>
        </Tooltip>
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
