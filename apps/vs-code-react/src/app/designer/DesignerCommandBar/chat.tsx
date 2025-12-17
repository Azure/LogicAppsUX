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
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { useIntlFormatters, useIntlMessages, chatMessages } from '../../../intl';
import { VSCodeContext } from '../../../webviewCommunication';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingAuthRequests = useRef<Map<string, { resolve: (success: boolean) => void }>>(new Map());

  const vscode = useContext(VSCodeContext);

  const agentChatUrl = useMemo(() => data?.chatUrl, [data?.chatUrl]);

  const intlText = useIntlMessages(chatMessages);
  const format = useIntlFormatters(chatMessages);

  // Handle messages from the chat iframe for auth popup requests
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Handle auth popup request from iframe
      if (message && message.type === 'VSCODE_OPEN_AUTH_POPUP') {
        const { url, requestId } = message.data;
        console.log('[ChatButton] Received auth popup request:', { url, requestId });

        // Store the pending request
        pendingAuthRequests.current.set(requestId, {
          resolve: (success: boolean) => {
            // Send result back to iframe
            if (iframeRef.current?.contentWindow) {
              iframeRef.current.contentWindow.postMessage(
                {
                  type: 'VSCODE_AUTH_POPUP_RESULT',
                  data: { requestId, success, error: success ? undefined : 'Authentication failed or was cancelled' },
                },
                '*'
              );
            }
          },
        });

        // Send message to VS Code extension to open the popup
        vscode.postMessage({
          command: ExtensionCommand.openOauthLoginPopup,
          url,
          requestId, // Pass requestId so extension can track it
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [vscode]);

  // Listen for OAuth completion from extension
  useEffect(() => {
    const handleExtensionMessage = (event: MessageEvent) => {
      const message = event.data;

      // Handle OAuth completion from extension
      if (message && message.command === ExtensionCommand.completeOauthLogin) {
        const { requestId, code, error } = message.value || {};

        // If we have a requestId, resolve the specific pending request
        if (requestId && pendingAuthRequests.current.has(requestId)) {
          const pending = pendingAuthRequests.current.get(requestId);
          pending?.resolve(!error && !!code);
          pendingAuthRequests.current.delete(requestId);
        } else {
          // Fallback: resolve the most recent pending request (for backward compatibility)
          const entries = Array.from(pendingAuthRequests.current.entries());
          if (entries.length > 0) {
            const [lastRequestId, pending] = entries[entries.length - 1];
            pending.resolve(!error);
            pendingAuthRequests.current.delete(lastRequestId);
          }
        }
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);

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

    // Build the iframe URL with VS Code mode enabled
    const baseUrl = agentChatUrl || '';
    const separator = baseUrl.includes('?') ? '&' : '?';
    const iframeUrl = `${baseUrl}${separator}apiKey=${data?.queryParams?.apiKey}&inVSCode=true${isDarkMode ? '&mode=dark' : ''}`;

    return (
      <iframe
        ref={iframeRef}
        src={iframeUrl}
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
