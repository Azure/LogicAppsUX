import type { ConversationItem } from '@microsoft/designer-ui';
import { useEffect, useMemo, useState } from 'react';
import { Spinner, Text } from '@fluentui/react-components';
import { ChatbotUI } from '@microsoft/logic-apps-chatbot';
import { useSelectedRun } from '../../core/state/evaluation/evaluationSelectors';
import { useChatHistory } from '../../core/queries/runs';
import { parseChatHistory } from '../panel/agentChat/helper';
import { useIsA2AWorkflow } from '../../core/state/designerView/designerViewSelectors';
import { useAgentOperations } from '../../core/state/workflow/workflowSelectors';
import { useEvaluateViewStyles } from './EvaluateView.styles';

export const AgentChatPanel = () => {
  const styles = useEvaluateViewStyles();
  const selectedRun = useSelectedRun();

  const isA2AWorkflow = useIsA2AWorkflow();
  const agentOperations = useAgentOperations();
  const runId = selectedRun?.id;

  const { isFetching: isChatHistoryFetching, data: chatHistoryData } = useChatHistory(!!runId, runId, agentOperations, isA2AWorkflow);

  const [conversation, setConversation] = useState<ConversationItem[]>([]);

  const noopToolResult = useMemo(() => () => {}, []);
  const noopToolContent = useMemo(() => () => {}, []);
  const noopAgent = useMemo(() => () => {}, []);

  useEffect(() => {
    if (chatHistoryData) {
      const items = parseChatHistory(chatHistoryData, noopToolResult as any, noopToolContent as any, noopAgent, isA2AWorkflow);
      setConversation(items);
    } else {
      setConversation([]);
    }
  }, [chatHistoryData, noopToolResult, noopToolContent, noopAgent, isA2AWorkflow]);

  if (!selectedRun) {
    return (
      <div className={styles.emptyState}>
        <Text>Select a run to view chat history</Text>
      </div>
    );
  }

  if (isChatHistoryFetching) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="small" label="Loading chat history..." />
      </div>
    );
  }

  if (conversation.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text>No chat history available for this run</Text>
      </div>
    );
  }

  return (
    <div className={styles.chatPanelContainer}>
      <ChatbotUI
        panel={{}}
        inputBox={{
          onSubmit: () => Promise.resolve(),
          readOnly: true,
        }}
        string={{
          submit: '',
          progressState: '',
          progressSave: '',
        }}
        body={{
          messages: conversation,
          focus: false,
          answerGenerationInProgress: false,
          setFocus: () => {},
        }}
      />
    </div>
  );
};
