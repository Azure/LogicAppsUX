import { PanelLocation, PanelResizer, PanelSize, type ConversationItem } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { defaultChatbotPanelWidth, ChatbotUI } from '@microsoft/logic-apps-chatbot';
import { runsQueriesKeys, useAgentChatInvokeUri, useCancelRun, useActionsChatHistory } from '../../../core/queries/runs';
import { useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useAgentLastOperations,
  useAgentOperations,
  useFocusElement,
  useUriForAgentChat,
  useRunInstance,
} from '../../../core/state/workflow/workflowSelectors';
import { isNullOrUndefined, LogEntryLevel, LoggerService, RunService } from '@microsoft/logic-apps-shared';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Drawer,
  mergeClasses,
} from '@fluentui/react-components';
import { ChatFilled } from '@fluentui/react-icons';
import { useDispatch } from 'react-redux';
import { changePanelNode, getReactQueryClient, type AppDispatch } from '../../../core';
import { clearFocusElement, setFocusNode, setRunIndex } from '../../../core/state/workflow/workflowSlice';
import { AgentChatHeader } from './agentChatHeader';
import { parseChatHistory } from './helper';
import { useMutation } from '@tanstack/react-query';
import constants from '../../../common/constants';

interface AgentChatProps {
  panelLocation?: PanelLocation;
  chatbotWidth?: string;
  panelContainerRef: React.MutableRefObject<HTMLElement | null>;
}

export const AgentChat = ({
  panelLocation = PanelLocation.Left,
  chatbotWidth = defaultChatbotPanelWidth,
  panelContainerRef,
}: AgentChatProps) => {
  const intl = useIntl();
  const [focus, setFocus] = useState(false);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [textInput, setTextInput] = useState<string>('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const isMonitoringView = useMonitoringView();
  const runInstance = useRunInstance();
  const agentOperations = useAgentOperations();
  const agentLastOperations = useAgentLastOperations(agentOperations);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelContainerElement = panelContainerRef.current as HTMLElement;
  const agentChatSuffixUri = useUriForAgentChat(conversation.length > 0 ? conversation[0].metadata?.parentId : undefined);
  const {
    refetch: refetchChatHistory,
    isFetching: isChatHistoryFetching,
    data: chatHistoryData,
  } = useActionsChatHistory(!!isMonitoringView, agentOperations, runInstance?.id);
  const { data: chatInvokeUri } = useAgentChatInvokeUri(!!isMonitoringView, true, agentChatSuffixUri);
  const [overrideWidth, setOverrideWidth] = useState<string | undefined>(chatbotWidth);
  const dispatch = useDispatch<AppDispatch>();
  const drawerWidth = isCollapsed ? PanelSize.Auto : overrideWidth;
  const panelRef = useRef<HTMLDivElement>(null);
  const focusElement = useFocusElement();
  const rawAgentLastOperations = JSON.stringify(agentLastOperations);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { mutateAsync: refreshChat } = useMutation(async () => {
    const queryClient = getReactQueryClient();
    await queryClient.resetQueries([runsQueriesKeys.useRunInstance]);
    await queryClient.resetQueries([runsQueriesKeys.useActionsChatHistory]);
    await queryClient.resetQueries([runsQueriesKeys.useAgentActionsRepetition]);
    await queryClient.resetQueries([runsQueriesKeys.useAgentRepetition]);
    await queryClient.resetQueries([runsQueriesKeys.useNodeRepetition]);

    await queryClient.refetchQueries([runsQueriesKeys.useRunInstance]);
    await queryClient.refetchQueries([runsQueriesKeys.useAgentRepetition]);
    await queryClient.refetchQueries([runsQueriesKeys.useAgentActionsRepetition]);
    await queryClient.refetchQueries([runsQueriesKeys.useNodeRepetition]);
    await queryClient.refetchQueries([runsQueriesKeys.useActionsChatHistory]);
  });

  const showStopButton = useMemo(() => {
    return runInstance?.properties?.status === constants.FLOW_STATUS.RUNNING;
  }, [runInstance]);

  const { mutateAsync: cancelRun } = useCancelRun(runInstance?.id ?? '');

  const stopChat = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const onCancel = useCallback(async () => {
    await cancelRun();
    await refreshChat();
  }, [cancelRun, refreshChat]);

  const onClosingDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const toolResultCallback = useCallback(
    (agentName: string, toolName: string, iteration: number, subIteration: number) => {
      const agentLastOperation = JSON.parse(rawAgentLastOperations)?.[agentName]?.[toolName];
      dispatch(setRunIndex({ page: iteration, nodeId: agentName }));
      dispatch(setRunIndex({ page: subIteration, nodeId: toolName }));
      dispatch(setFocusNode(agentLastOperation));
      dispatch(changePanelNode(agentLastOperation));
    },
    [dispatch, rawAgentLastOperations]
  );

  const toolContentCallback = useCallback(
    (agentName: string, iteration: number) => {
      dispatch(setRunIndex({ page: iteration, nodeId: agentName }));
      dispatch(setFocusNode(agentName));
      dispatch(changePanelNode(agentName));
    },
    [dispatch]
  );

  const agentCallback = useCallback(
    (agentName: string) => {
      dispatch(setRunIndex({ page: 0, nodeId: agentName }));
      dispatch(setFocusNode(agentName));
      dispatch(changePanelNode(agentName));
    },
    [dispatch]
  );

  const onChatSubmit = useCallback(async () => {
    if (!textInput || isNullOrUndefined(chatInvokeUri)) {
      return;
    }

    setIsWaitingForResponse(true);

    try {
      await RunService().invokeAgentChat({
        id: chatInvokeUri,
        data: { role: 'User', content: textInput },
      });

      refetchChatHistory();
    } catch (e: any) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'agentchat',
        message: 'Agent chat invocation failed',
        error: e,
      });
    }

    setIsWaitingForResponse(false);
    setTextInput('');
  }, [textInput, chatInvokeUri, refetchChatHistory]);

  useEffect(() => {
    if (!isNullOrUndefined(chatHistoryData)) {
      const newConversations = parseChatHistory(chatHistoryData, toolResultCallback, toolContentCallback, agentCallback);
      setConversation([...newConversations]);
    }
  }, [setConversation, chatHistoryData, dispatch, toolResultCallback, toolContentCallback, agentCallback]);

  const intlText = useMemo(() => {
    return {
      agentChatHeader: intl.formatMessage({
        defaultMessage: 'Agent chat',
        id: 'PVT2SW',
        description: 'Agent chat header text',
      }),
      agentChatPanelAriaLabel: intl.formatMessage({
        defaultMessage: 'Agent chat panel',
        id: 'OSugtm',
        description: 'Agent chat panel aria label text',
      }),
      agentChatToggleAriaLabel: intl.formatMessage({
        defaultMessage: 'Toggle the agent chat panel.',
        id: 'fTpBGQ',
        description: 'Toggle the agent chat panel aria label text',
      }),
      chatReadOnlyMessage: intl.formatMessage({
        defaultMessage: 'The chat is currently in read-only mode. Agents are unavailable for live chat.',
        id: '7c50FE',
        description: 'Agent chat read-only message',
      }),
      protectedMessage: intl.formatMessage({
        defaultMessage: 'Your personal and company data are protected in this chat',
        id: 'Yrw/Qt',
        description: 'Letting user know that their data is protected in the chatbot',
      }),
      submitButtonTitle: intl.formatMessage({
        defaultMessage: 'Submit',
        id: 'Oep6va',
        description: 'Submit button',
      }),
      actionsButtonTitle: intl.formatMessage({
        defaultMessage: 'Actions',
        id: 'Vqs8hE',
        description: 'Actions button',
      }),
      assistantErrorMessage: intl.formatMessage({
        defaultMessage: 'Sorry, something went wrong. Please try again.',
        id: 'fvGvnA',
        description: 'Chatbot error message',
      }),
      progressCardText: intl.formatMessage({
        defaultMessage: 'Processing...',
        id: '6776lH',
        description: 'Processing message in the chatbot',
      }),
      progressCardSaveText: intl.formatMessage({
        defaultMessage: '💾 Saving this flow...',
        id: '4iyEAY',
        description: 'Chatbot card telling user that the workflow is being saved',
      }),
      cancelGenerationText: intl.formatMessage({
        defaultMessage: 'Copilot chat canceled',
        id: 'JKZpcd',
        description: 'Chatbot card telling user that the AI response is being canceled',
      }),
      stopChatTitle: intl.formatMessage({
        defaultMessage: 'Stop chat',
        id: '9KwscD',
        description: 'Stop chat title',
      }),
      stopChatMessage: intl.formatMessage({
        defaultMessage: 'Do you want to stop the agent chat? This will cancel the workflow.',
        id: '7cPLnJ',
        description: 'Stop chat message',
      }),
      cancelDialog: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: 'hHNj31',
        description: 'Cancel button text',
      }),
      okDialog: intl.formatMessage({
        defaultMessage: 'OK',
        id: 'wWuzqz',
        description: 'Ok button text',
      }),
    };
  }, [intl]);

  return (
    <Drawer
      aria-label={intlText.agentChatPanelAriaLabel}
      className="msla-panel-container"
      modalType="non-modal"
      mountNode={{
        className: 'msla-panel-host-container',
        element: panelContainerElement,
      }}
      open={true}
      position={'end'}
      ref={panelRef}
      style={{
        position: 'relative',
        maxWidth: '100%',
        width: drawerWidth,
        height: '100%',
      }}
    >
      {isCollapsed ? (
        <Button
          appearance="subtle"
          aria-label={intlText.agentChatToggleAriaLabel}
          className={mergeClasses('collapse-toggle', 'right', 'empty')}
          icon={<ChatFilled />}
          onClick={() => setIsCollapsed(false)}
          data-automation-id="msla-panel-header-collapse-nav"
        />
      ) : null}
      {isCollapsed ? null : (
        <>
          <ChatbotUI
            panel={{
              location: panelLocation,
              width: chatbotWidth,
              isOpen: true,
              isBlocking: false,
              onDismiss: () => {},
              header: (
                <AgentChatHeader
                  showStopButton={showStopButton}
                  title={intlText.agentChatHeader}
                  onStopChat={stopChat}
                  onRefreshChat={refreshChat}
                  onToggleCollapse={() => setIsCollapsed(true)}
                />
              ),
            }}
            inputBox={{
              onSubmit: () => {
                onChatSubmit();
              },
              onChange: setTextInput,
              value: textInput,
              readOnly: !chatInvokeUri,
              readOnlyText: intlText.chatReadOnlyMessage,
            }}
            string={{
              submit: intlText.submitButtonTitle,
              progressState: intlText.progressCardText,
              progressSave: intlText.progressCardSaveText,
              protectedMessage: intlText.protectedMessage,
            }}
            body={{
              messages: conversation,
              focus: focus,
              answerGenerationInProgress: isChatHistoryFetching || isWaitingForResponse,
              setFocus: setFocus,
              focusMessageId: focusElement,
              clearFocusMessageId: () => dispatch(clearFocusElement()),
            }}
          />
          <PanelResizer updatePanelWidth={setOverrideWidth} panelRef={panelRef} />
          <Dialog
            inertTrapFocus={true}
            open={dialogOpen}
            aria-labelledby={intlText.stopChatTitle}
            onOpenChange={onClosingDialog}
            surfaceMotion={null}
          >
            <DialogSurface
              style={{
                maxWidth: '80%',
                width: 'fit-content',
              }}
              backdrop={<div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)' }}> </div>}
              mountNode={panelRef.current}
            >
              <DialogBody>
                <DialogTitle>{intlText.stopChatTitle}</DialogTitle>
                <DialogContent>{intlText.stopChatMessage}</DialogContent>
                <DialogActions fluid>
                  <DialogTrigger>
                    <Button appearance="primary" onClick={onCancel}>
                      {intlText.okDialog}
                    </Button>
                  </DialogTrigger>
                  <DialogTrigger>
                    <Button onClick={onClosingDialog}>{intlText.cancelDialog}</Button>
                  </DialogTrigger>
                </DialogActions>
              </DialogBody>
            </DialogSurface>
          </Dialog>
        </>
      )}
    </Drawer>
  );
};
