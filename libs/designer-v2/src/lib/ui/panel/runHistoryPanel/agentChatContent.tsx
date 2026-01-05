import type { ConversationItem } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { ChatbotUI } from '@microsoft/logic-apps-chatbot';
import { useAgentChatInvokeUri, useCancelRun, useChatHistory } from '../../../core/queries/runs';
import { useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useAgentLastOperations,
  useAgentOperations,
  useFocusElement,
  useUriForAgentChat,
  useRunInstance,
} from '../../../core/state/workflow/workflowSelectors';
import { isNullOrUndefined, LogEntryLevel, LoggerService, RunService } from '@microsoft/logic-apps-shared';
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogTitle, DialogTrigger } from '@fluentui/react-components';
import { useDispatch } from 'react-redux';
import { changePanelNode, type AppDispatch } from '../../../core';
import {
  clearFocusElement,
  setFocusNode,
  setRunIndex,
  setTimelineRepetitionIndex,
  setToolRunIndex,
} from '../../../core/state/workflow/workflowSlice';
import { parseChatHistory, useRefreshChatMutation } from '../agentChat/helper';
// import constants from '../../../common/constants';
import { useIsA2AWorkflow } from '../../../core/state/designerView/designerViewSelectors';

export const AgentChatContent = () => {
  // State section
  const [focus, setFocus] = useState(false);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [textInput, setTextInput] = useState<string>('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Custom hooks section
  const isMonitoringView = useMonitoringView();
  const runInstance = useRunInstance();
  const agentOperations = useAgentOperations();
  const agentLastOperations = useAgentLastOperations(agentOperations);
  const isA2AWorkflow = useIsA2AWorkflow();
  const agentChatSuffixUri = useUriForAgentChat(conversation.length > 0 ? conversation[0].metadata?.parentId : undefined);
  const focusElement = useFocusElement();
  const { mutateAsync: refreshChat } = useRefreshChatMutation();

  // Query sections
  const {
    refetch: refetchChatHistory,
    isFetching: isChatHistoryFetching,
    data: chatHistoryData,
  } = useChatHistory(!!isMonitoringView, runInstance?.id, agentOperations, isA2AWorkflow);
  const { data: chatInvokeUri } = useAgentChatInvokeUri(!!isMonitoringView, true, agentChatSuffixUri);

  // Miscellaneous section
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const rawAgentLastOperations = JSON.stringify(agentLastOperations);

  // const showStopButton = useMemo(() => {
  // 	return runInstance?.properties?.status === constants.FLOW_STATUS.RUNNING;
  // }, [runInstance]);

  // const stopChat = useCallback(() => {
  // 	setDialogOpen(true);
  // }, []);

  const { mutateAsync: cancelRun } = useCancelRun(runInstance?.id ?? '');

  const onCancel = useCallback(async () => {
    await cancelRun();
    await refreshChat();
  }, [cancelRun, refreshChat]);

  const onClosingDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const toolResultCallback = useCallback(
    (agentName: string, toolName: string, iteration: number, subIteration: number, mcpToolName?: string) => {
      const agentLastOperation = JSON.parse(rawAgentLastOperations)?.[agentName]?.[toolName];
      if (isA2AWorkflow) {
        dispatch(setTimelineRepetitionIndex(iteration));
      } else {
        dispatch(setRunIndex({ page: iteration, nodeId: agentName }));
        if (mcpToolName) {
          dispatch(setToolRunIndex({ page: subIteration, nodeId: toolName }));
        } else {
          dispatch(setRunIndex({ page: subIteration, nodeId: toolName }));
        }
      }

      dispatch(setFocusNode(agentLastOperation));
      dispatch(changePanelNode(agentLastOperation));
    },
    [dispatch, isA2AWorkflow, rawAgentLastOperations]
  );

  const toolContentCallback = useCallback(
    (agentName: string, iteration: number) => {
      if (isA2AWorkflow) {
        dispatch(setTimelineRepetitionIndex(iteration));
      } else {
        dispatch(setRunIndex({ page: iteration, nodeId: agentName }));
      }
      dispatch(setFocusNode(agentName));
      dispatch(changePanelNode(agentName));
    },
    [dispatch, isA2AWorkflow]
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
      const newConversations = parseChatHistory(chatHistoryData, toolResultCallback, toolContentCallback, agentCallback, isA2AWorkflow);
      setConversation([...newConversations]);
    }
  }, [setConversation, chatHistoryData, dispatch, toolResultCallback, toolContentCallback, agentCallback, isA2AWorkflow]);

  const intlText = useMemo(() => {
    return {
      agentChatHeader: intl.formatMessage({
        defaultMessage: 'Agent log',
        id: 'WtHzoy',
        description: 'Agent log header text',
      }),
      agentChatPanelAriaLabel: intl.formatMessage({
        defaultMessage: 'Agent log panel',
        id: 'MzVpzv',
        description: 'Agent log panel aria label text',
      }),
      agentChatToggleAriaLabel: intl.formatMessage({
        defaultMessage: 'Toggle the agent log panel.',
        id: 'QIzNzB',
        description: 'Toggle the agent log panel aria label text',
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
    <>
      <ChatbotUI
        panel={{}}
        inputBox={{
          onSubmit: onChatSubmit,
          onChange: setTextInput,
          value: textInput,
          readOnly: !chatInvokeUri,
        }}
        string={{
          submit: intlText.submitButtonTitle,
          progressState: intlText.progressCardText,
          progressSave: intlText.progressCardSaveText,
        }}
        body={{
          messages: conversation,
          focus,
          answerGenerationInProgress: isChatHistoryFetching || isWaitingForResponse,
          setFocus,
          focusMessageId: focusElement,
          clearFocusMessageId: () => dispatch(clearFocusElement()),
        }}
      />
      <Dialog
        inertTrapFocus={true}
        open={dialogOpen}
        aria-labelledby={intlText.stopChatTitle}
        onOpenChange={onClosingDialog}
        surfaceMotion={undefined}
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
      </Dialog>
    </>
  );
};
