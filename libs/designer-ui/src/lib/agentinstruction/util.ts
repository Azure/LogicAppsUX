import { getIntl, isUndefinedOrEmptyString, type ValueSegment } from '@microsoft/logic-apps-shared';
import { convertSegmentsToString } from '../editor/base/utils/parsesegments';
import { convertStringToSegments } from '../editor/base/utils/editorToSegment';
import { createLiteralValueSegment } from '../editor/base/utils/helper';
import type { ChangeState } from '../editor/base';

interface AgentInstructions {
  role: string;
  content: string;
}

export const AGENT_INSTRUCTION_TYPES = {
  SYSTEM: 'system',
  USER: 'user',
} as const;
export type AGENT_INSTRUCTION_TYPES = (typeof AGENT_INSTRUCTION_TYPES)[keyof typeof AGENT_INSTRUCTION_TYPES];

export const parseAgentInstruction = (
  initialValue: ValueSegment[],
  setErrorMessage: (s: string) => void
): { systemMessage: ValueSegment[]; userMessage: ValueSegment[] } => {
  const nodeMap: Map<string, ValueSegment> = new Map<string, ValueSegment>();
  const initialValueString = convertSegmentsToString(initialValue, nodeMap);

  try {
    if (!initialValueString) {
      return { systemMessage: [], userMessage: [] };
    }
    const parsedInitialValue: AgentInstructions[] = JSON.parse(initialValueString);
    if (Array.isArray(parsedInitialValue)) {
      let systemMessage: ValueSegment[] = [];
      const userMessage: ValueSegment[] = [createLiteralValueSegment('[')];

      parsedInitialValue.forEach((instruction, index) => {
        const convertedContent = convertStringToSegments(instruction.content, nodeMap, { tokensEnabled: true });

        if (instruction.role.toLowerCase() === AGENT_INSTRUCTION_TYPES.SYSTEM && index === 0) {
          systemMessage = convertedContent;
        } else if (instruction.role.toLowerCase() === AGENT_INSTRUCTION_TYPES.USER) {
          userMessage.push(
            createLiteralValueSegment('"'),
            ...convertedContent,
            createLiteralValueSegment('"'),
            createLiteralValueSegment(',')
          );
        }
      });

      // Remove the last comma safely if it exists before appending the closing bracket
      if (userMessage[userMessage.length - 1]?.value === ',') {
        userMessage.pop();
      }
      userMessage.push(createLiteralValueSegment(']'));

      return { systemMessage, userMessage };
    }
  } catch {
    const intl = getIntl();
    const errorMessage = intl.formatMessage({
      defaultMessage: 'Error occurred while parsing agent instructions.',
      description: 'Error message for agent instructions parsing failure',
      id: 'WmLk8l',
    });
    setErrorMessage(errorMessage);
  }

  return { systemMessage: [], userMessage: [] };
};

export const serializeAgentInstructions = (
  payload: ChangeState,
  agentLevel: AGENT_INSTRUCTION_TYPES,
  systemMessage: ValueSegment[],
  userMessage: ValueSegment[]
): ValueSegment[] => {
  const { value, viewModel } = payload;
  const nodeMap = new Map<string, ValueSegment>();
  const agentInstructions: AgentInstructions[] = [];

  // Convert system message
  const systemMessageString = convertSegmentsToString(agentLevel === AGENT_INSTRUCTION_TYPES.SYSTEM ? value : systemMessage, nodeMap);
  agentInstructions.push({
    role: AGENT_INSTRUCTION_TYPES.SYSTEM,
    content: systemMessageString ?? '',
  });

  // Convert user messages
  const userMessageString = convertSegmentsToString(
    agentLevel === AGENT_INSTRUCTION_TYPES.USER ? (viewModel?.uncastedValue ?? []) : userMessage,
    nodeMap
  );

  try {
    const parsedUserMessages = JSON.parse(userMessageString);
    if (Array.isArray(parsedUserMessages)) {
      parsedUserMessages.forEach((message: string) => {
        if (!isUndefinedOrEmptyString(message)) {
          agentInstructions.push({
            role: AGENT_INSTRUCTION_TYPES.USER,
            content: message,
          });
        }
      });
    }
  } catch {
    // If something goes wrong with the parsing (ex if user adds it incorrectly from collapsed view), we'll just add the raw string
    if (!isUndefinedOrEmptyString(userMessageString)) {
      agentInstructions.push({
        role: AGENT_INSTRUCTION_TYPES.USER,
        content: userMessageString,
      });
    }
  }

  return convertStringToSegments(JSON.stringify(agentInstructions, null, 4), nodeMap, {
    tokensEnabled: true,
  });
};
