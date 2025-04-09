import {
  AgentMessageEntryType,
  ConversationItemType,
  PanelLocation,
  PanelResizer,
  PanelSize,
  type ConversationItem,
} from '@microsoft/designer-ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { defaultChatbotPanelWidth, ChatbotContent } from '@microsoft/logic-apps-chatbot';
import { type ChatHistory, useChatHistory } from '../../../core/queries/runs';
import { useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import {
  useAgentLastOperations,
  useAgentOperations,
  useIsChatInputEnabled,
  useRunInstance,
} from '../../../core/state/workflow/workflowSelectors';
import { guid, isNullOrUndefined, labelCase } from '@microsoft/logic-apps-shared';
import { Button, Drawer, mergeClasses } from '@fluentui/react-components';
import { ChatFilled } from '@fluentui/react-icons';
import { useDispatch } from 'react-redux';
import { changePanelNode, type AppDispatch } from '../../../core';
import type { Dispatch } from '@reduxjs/toolkit';
import { setFocusNode, setRunIndex } from '../../../core/state/workflow/workflowSlice';
import { AgentChatHeader } from './agentChatHeader';

interface AgentChatProps {
  panelLocation?: PanelLocation;
  chatbotWidth?: string;
  panelContainerRef: React.MutableRefObject<HTMLElement | null>;
}

const parseChatHistory = (chatHistory: ChatHistory[], dispatch: Dispatch, agentLastOperations: Record<string, any>): ConversationItem[] => {
  const toolResultCallback = (agentName: string, toolName: string, iteration: number, subIteration: number) => {
    const agentLastOperation = agentLastOperations[agentName][toolName];
    dispatch(setRunIndex({ page: iteration, nodeId: agentName }));
    dispatch(setRunIndex({ page: subIteration, nodeId: toolName }));
    dispatch(setFocusNode(agentLastOperation));
    dispatch(changePanelNode(agentLastOperation));
  };

  const toolContentCallback = (agentName: string, iteration: number) => {
    dispatch(setRunIndex({ page: iteration, nodeId: agentName }));
    dispatch(setFocusNode(agentName));
    dispatch(changePanelNode(agentName));
  };

  const agentCallback = (agentName: string) => {
    dispatch(setRunIndex({ page: 0, nodeId: agentName }));
    dispatch(setFocusNode(agentName));
    dispatch(changePanelNode(agentName));
  };

  const conversations: ConversationItem[] = [];

  for (const chat of chatHistory) {
    const { nodeId, messages } = chat;
    const parsedMessages: any[] = (messages ?? []).map((message) => parseMessage(message, nodeId, toolResultCallback, toolContentCallback));

    if (parsedMessages.length > 0) {
      const agentName = labelCase(nodeId);
      conversations.push(...parsedMessages, {
        id: guid(),
        text: agentName,
        type: ConversationItemType.AgentHeader,
        onClick: () => {
          agentCallback(nodeId);
        },
        date: new Date(), // Using current time for header; modify if needed
      });
    }
  }

  return conversations;
};

const parseMessage = (
  message: any,
  parentId: string,
  toolResultCallback: (agentName: string, toolName: string, iteration: number, subIteration: number) => void,
  toolContentCallback: (agentName: string, iteration: number) => void
): ConversationItem => {
  const { messageEntryType, messageEntryPayload, timestamp, role, iteration } = message;

  switch (messageEntryType) {
    case AgentMessageEntryType.Content: {
      const content = messageEntryPayload?.content || '';
      return {
        text: content,
        type: ConversationItemType.Reply,
        id: guid(),
        role: {
          text: role,
          agentName: labelCase(parentId),
          onClick: () => toolContentCallback(parentId, iteration),
        },
        hideFooter: true,
        metadata: { parentId },
        date: new Date(timestamp),
        isMarkdownText: false,
        className: 'msla-agent-chat-content',
      };
    }
    case AgentMessageEntryType.ToolResult: {
      const subIteration = message.toolResultsPayload?.toolResult?.subIteration ?? 0;
      const toolName = message.toolResultsPayload?.toolResult?.toolName ?? '';
      const status = message.toolResultsPayload?.toolResult?.status;

      return {
        id: guid(),
        text: toolName,
        type: ConversationItemType.Tool,
        onClick: () => toolResultCallback(parentId, toolName, iteration, subIteration),
        status,
        date: new Date(timestamp),
      };
    }
    default: {
      return {
        text: '',
        type: ConversationItemType.Reply,
        id: guid(),
        role,
        hideFooter: true,
        metadata: { parentId },
        date: new Date(timestamp),
        isMarkdownText: false,
      };
    }
  }
};

export const AgentChat = ({
  panelLocation = PanelLocation.Left,
  chatbotWidth = defaultChatbotPanelWidth,
  panelContainerRef,
}: AgentChatProps) => {
  const intl = useIntl();
  const [inputQuery, setInputQuery] = useState('');
  const [focus, setFocus] = useState(false);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const isMonitoringView = useMonitoringView();
  const runInstance = useRunInstance();
  const agentOperations = useAgentOperations();
  const agentLastOperations = useAgentLastOperations(agentOperations);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelContainerElement = panelContainerRef.current as HTMLElement;
  const { isFetching: isChatHistoryFetching, data: chatHistoryData } = useChatHistory(!!isMonitoringView, agentOperations, runInstance?.id);
  const [overrideWidth, setOverrideWidth] = useState<string | undefined>(chatbotWidth);
  const isChatInputEnabled = useIsChatInputEnabled(conversation.length > 0 ? conversation[0].metadata?.parentId : undefined);
  const dispatch = useDispatch<AppDispatch>();
  const agentsNumber = Object.keys(agentLastOperations).length;
  const drawerWidth = isCollapsed ? PanelSize.Auto : overrideWidth;
  const panelRef = useRef<HTMLDivElement>(null);

  console.log('charlie', chatHistoryData);

  useEffect(() => {
    if (!isNullOrUndefined(chatHistoryData)) {
      const newConversations = parseChatHistory(chatHistoryData, dispatch, agentLastOperations);
      setConversation([...newConversations]);
    }
  }, [setConversation, chatHistoryData, agentsNumber, dispatch]);

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
        defaultMessage: 'Toggle agent chat panel',
        id: '0Jh+AD',
        description: 'Toggle agent chat panel aria label text',
      }),
      chatReadOnlyMessage: intl.formatMessage({
        defaultMessage: 'The chat is currently in read-only mode. Agents are not available for live chat.',
        id: '/fYAbG',
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
        defaultMessage: 'Fetching chat history...',
        id: '7col/w',
        description: 'Fetching chat history progress card text',
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
    };
  }, [intl]);

  useEffect(() => {
    setInputQuery('');
  }, [conversation]);

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
          <ChatbotContent
            panel={{
              location: panelLocation,
              width: chatbotWidth,
              isOpen: true,
              isBlocking: false,
              onDismiss: () => {},
              header: <AgentChatHeader title={intlText.agentChatHeader} toggleCollapse={() => setIsCollapsed(true)} />,
            }}
            inputBox={{
              value: inputQuery,
              onChange: setInputQuery,
              onSubmit: () => {},
              disabled: isChatInputEnabled,
              readOnly: true,
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
              answerGenerationInProgress: isChatHistoryFetching,
              setFocus: setFocus,
            }}
          />
          <PanelResizer updatePanelWidth={setOverrideWidth} panelRef={panelRef} />
        </>
      )}
    </Drawer>
  );
};
