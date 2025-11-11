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
import { MessageBar, MessageBarType } from '@fluentui/react';
import { useIntlFormatters, useIntlMessages } from 'intl';
import { chatMessages } from 'intl/messages';

const ChatIcon = bundleIcon(Chat24Filled, Chat24Regular);
const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);
const InfoIcon = bundleIcon(Info24Filled, Info24Regular);

export const useAgentUrl = (props: {
  isWorkflowRuntimeRunning?: boolean;
  getAgentUrl?: () => Promise<AgentURL>;
}): UseQueryResult<AgentURL> => {
  return useQuery(
    ['agentUrl', props.isWorkflowRuntimeRunning],
    async () => {
      return props.getAgentUrl?.();
    },
    {
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: props.isWorkflowRuntimeRunning ?? false,
    }
  );
};

export type ChatButtonProps = ButtonProps & {
  isDarkMode: boolean;
  isDraftMode?: boolean;
  siteResourceId?: string;
  workflowName?: string;
  tooltipText?: string;
  isWorkflowRuntimeRunning?: boolean;
  getAgentUrl?: () => Promise<AgentURL>;
  saveWorkflow: () => Promise<void>;
};

export const ChatButton = (props: ChatButtonProps) => {
  const {
    isDarkMode,
    isDraftMode,
    getAgentUrl,
    saveWorkflow,
    tooltipText: clientStateTooltipText,
    isWorkflowRuntimeRunning,
    ...buttonProps
  } = props;
  const { isLoading, data } = useAgentUrl({ isWorkflowRuntimeRunning, getAgentUrl });
  const [isSaving, setIsSaving] = useState(false);
  const [onDialogOpen, setOnDialogOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  const agentChatUrl = useMemo(() => data?.chatUrl, [data?.chatUrl]);

  const intlText = useIntlMessages(chatMessages);
  const format = useIntlFormatters(chatMessages);

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
      return clientStateTooltipText ?? intlText.DEFAULT_TOOLTIP;
    }

    if (data?.authenticationEnabled && isDraftMode) {
      return format.CHAT_IN_AUTHENTICATION_DRAFT({ url: agentChatUrl });
    }

    if (data?.authenticationEnabled) {
      return format.CHAT_IN_AUTHENTICATION_PROD({ url: agentChatUrl });
    }

    return intlText.DEFAULT_TOOLTIP;
  }, [
    buttonProps.disabled,
    clientStateTooltipText,
    data?.authenticationEnabled,
    isDraftMode,
    intlText.DEFAULT_TOOLTIP,
    format,
    agentChatUrl,
  ]);

  const chatContent = useMemo(() => {
    if (!isWorkflowRuntimeRunning) {
      return (
        <MessageBar data-testid="msla-overview-error-message" isMultiline={false} messageBarType={MessageBarType.error}>
          {intlText.DEBUG_PROJECT_ERROR}
        </MessageBar>
      );
    }

    if (isLoading || isSaving) {
      return <Spinner size="medium" label={intlText.LOADING} />;
    }

    return (
      <iframe
        src={`${agentChatUrl}${agentChatUrl?.includes('?') ? '&' : '?'}apiKey=${data?.queryParams?.apiKey}${isDarkMode ? '&mode=dark' : ''}`}
        title={intlText.TITLE}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation allow-storage-access-by-user-activation"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="eager"
        style={{ width: '100%', height: '99%', border: 'none', borderRadius: tokens.borderRadiusXLarge }}
      />
    );
  }, [
    isLoading,
    isSaving,
    agentChatUrl,
    data?.queryParams?.apiKey,
    isDarkMode,
    isWorkflowRuntimeRunning,
    intlText.TITLE,
    intlText.LOADING,
    intlText.DEBUG_PROJECT_ERROR,
  ]);

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
                disabled: buttonProps.disabled || isSaving || !agentChatUrl,
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
                'aria-label': intlText.INFO_TOOLTIP,
              }}
            >
              {intlText.CHAT_TEXT}
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
            <DialogTitle>{intlText.INFO_DIALOG_TITLE}</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS }}>
              <div>
                <Text weight="semibold" as="h4" block style={{ marginBottom: tokens.spacingVerticalXS }}>
                  {intlText.INFO_DIALOG_DEVELOPMENT}
                </Text>
                <Text as="p" block>
                  {intlText.INFO_DIALOG_DEVELOPMENT_DESC}
                </Text>
              </div>

              <div>
                <Text weight="semibold" as="h4" block style={{ marginBottom: tokens.spacingVerticalXS }}>
                  {intlText.INFO_DIALOG_PRODUCTION}
                </Text>
                <Text as="p" block>
                  {intlText.INFO_DIALOG_PRODUCTION_DESC}
                </Text>
              </div>

              <div>
                <Text weight="semibold" as="h4" block style={{ marginBottom: tokens.spacingVerticalXS }}>
                  {intlText.INFO_DIALOG_SETUP}
                </Text>
                <Text as="p" block style={{ marginBottom: tokens.spacingVerticalS }}>
                  {intlText.INFO_DIALOG_SETUP_DESC}
                </Text>
                <Link
                  href="https://azure.github.io/logicapps-labs/docs/logicapps-ai-course/build_conversational_agents/add-user-context-to-tools"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {intlText.INFO_DIALOG_LEARN_MORE}
                </Link>
              </div>
            </DialogContent>
            <div style={{ marginTop: tokens.spacingVerticalL, display: 'flex', justifyContent: 'flex-end' }}>
              <Button appearance="primary" onClick={() => setInfoDialogOpen(false)}>
                {intlText.CLOSE}
              </Button>
            </div>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};
