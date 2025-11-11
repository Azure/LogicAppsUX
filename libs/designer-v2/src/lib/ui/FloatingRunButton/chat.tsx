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
  Link,
  Spinner,
  SplitButton,
  Text,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import type { ButtonProps } from '@fluentui/react-components';
import { WorkflowService } from '@microsoft/logic-apps-shared';
import type { AgentURL } from '@microsoft/logic-apps-shared';
import {
  bundleIcon,
  Chat24Filled,
  Chat24Regular,
  Dismiss24Filled,
  Dismiss24Regular,
  Info24Filled,
  Info24Regular,
} from '@fluentui/react-icons';
import { useCallback, useMemo, useRef, useState } from 'react';

const ChatIcon = bundleIcon(Chat24Filled, Chat24Regular);
const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);
const InfoIcon = bundleIcon(Info24Filled, Info24Regular);

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
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  const agentChatUrl = useMemo(() => data?.chatUrl, [data?.chatUrl]);

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
      INFO_TOOLTIP: intl.formatMessage({
        defaultMessage: 'Chat availability information',
        id: 'a1fbm6',
        description: 'Tooltip for info button',
      }),
      INFO_DIALOG_TITLE: intl.formatMessage({
        defaultMessage: 'Chat availability: Development vs Production',
        id: 'FiSFtL',
        description: 'Title for chat info dialog',
      }),
      INFO_DIALOG_DEVELOPMENT: intl.formatMessage({
        defaultMessage: 'Development & Testing',
        id: '2p9WPX',
        description: 'Development section header in info dialog',
      }),
      INFO_DIALOG_DEVELOPMENT_DESC: intl.formatMessage({
        defaultMessage:
          'In-portal chat is available for testing and development purposes. This allows you to test your conversational workflows before deploying to production.',
        id: 'qIT2h2',
        description: 'Development section description in info dialog',
      }),
      INFO_DIALOG_PRODUCTION: intl.formatMessage({
        defaultMessage: 'Production',
        id: 'uG+CHc',
        description: 'Production section header in info dialog',
      }),
      INFO_DIALOG_PRODUCTION_DESC: intl.formatMessage({
        defaultMessage:
          'Chat is only available in production when authentication is enabled on the app. This ensures secure access to your workflow.',
        id: '8lZGy+',
        description: 'Production section description in info dialog',
      }),
      INFO_DIALOG_SETUP: intl.formatMessage({
        defaultMessage: 'Setting up authentication',
        id: 'PAkWmu',
        description: 'Setup section header in info dialog',
      }),
      INFO_DIALOG_SETUP_DESC: intl.formatMessage({
        defaultMessage: 'To enable authentication for production use, follow the authentication setup guide.',
        id: 'ukB9Bs',
        description: 'Setup section description in info dialog',
      }),
      INFO_DIALOG_LEARN_MORE: intl.formatMessage({
        defaultMessage: 'Learn more about authentication setup',
        id: 'DvKGRc',
        description: 'Link text for authentication setup guide',
      }),
      CLOSE: intl.formatMessage({
        defaultMessage: 'Close',
        id: '4BH2f8',
        description: 'Close button text',
      }),
    }),
    [intl, agentChatUrl]
  );

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
    <>
      <Dialog modalType="modal" surfaceMotion={null} open={onDialogOpen} onOpenChange={(_, data) => onOpenChange(data.open)}>
        <DialogTrigger disableButtonEnhancement>
          <Tooltip content={tooltipText} relationship="label" withArrow={true}>
            <SplitButton
              appearance={buttonProps.appearance}
              shape={buttonProps.shape}
              size={buttonProps.size}
              primaryActionButton={{
                disabled: buttonProps.disabled || isSaving || isLoading,
                icon: <ChatIcon />,
                onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  setOnDialogOpen(true);
                },
              }}
              menuButton={{
                icon: <InfoIcon />,
                onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  setInfoDialogOpen(true);
                },
                ref: infoButtonRef,
                'aria-label': IntlText.INFO_TOOLTIP,
              }}
            >
              {IntlText.CHAT_TEXT}
            </SplitButton>
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

      <Dialog modalType="alert" open={infoDialogOpen} onOpenChange={(_, data) => setInfoDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{IntlText.INFO_DIALOG_TITLE}</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS }}>
              <div>
                <Text weight="semibold" as="h4" block style={{ marginBottom: tokens.spacingVerticalXS }}>
                  {IntlText.INFO_DIALOG_DEVELOPMENT}
                </Text>
                <Text as="p" block>
                  {IntlText.INFO_DIALOG_DEVELOPMENT_DESC}
                </Text>
              </div>

              <div>
                <Text weight="semibold" as="h4" block style={{ marginBottom: tokens.spacingVerticalXS }}>
                  {IntlText.INFO_DIALOG_PRODUCTION}
                </Text>
                <Text as="p" block>
                  {IntlText.INFO_DIALOG_PRODUCTION_DESC}
                </Text>
              </div>

              <div>
                <Text weight="semibold" as="h4" block style={{ marginBottom: tokens.spacingVerticalXS }}>
                  {IntlText.INFO_DIALOG_SETUP}
                </Text>
                <Text as="p" block style={{ marginBottom: tokens.spacingVerticalS }}>
                  {IntlText.INFO_DIALOG_SETUP_DESC}
                </Text>
                <Link
                  href="https://azure.github.io/logicapps-labs/docs/logicapps-ai-course/build_conversational_agents/add-user-context-to-tools"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {IntlText.INFO_DIALOG_LEARN_MORE}
                </Link>
              </div>
            </DialogContent>
            <div style={{ marginTop: tokens.spacingVerticalL, display: 'flex', justifyContent: 'flex-end' }}>
              <Button appearance="primary" onClick={() => setInfoDialogOpen(false)}>
                {IntlText.CLOSE}
              </Button>
            </div>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};
