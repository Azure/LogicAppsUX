import type { ICopilotWorkflowEditorService, WorkflowEditResponse, WorkflowChange } from '../copilotWorkflowEditor';
import { WorkflowChangeType, WorkflowChangeTargetType } from '../copilotWorkflowEditor';
import type { Workflow } from '../../../utils/src';
import { ArgumentException } from '../../../utils/src';
import { COPILOT_WORKFLOW_TOOLS, executeCopilotTool } from './copilotWorkflowEditorTools';
import type { CopilotToolDefinition } from './copilotWorkflowEditorTools';
import { DEFAULT_SYSTEM_PROMPT } from './copilotWorkflowEditorPrompt';
import { SearchService } from '../search';
import { ConnectionService } from '../connection';

export interface CopilotWorkflowEditorServiceOptions {
  /** OpenAI-compatible API endpoint (e.g. https://api.openai.com/v1 or Azure OpenAI endpoint) */
  endpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Model to use (defaults to 'gpt-4o') */
  model?: string;
  /** Override the default system prompt */
  systemPrompt?: string;
  /** Deployment name for Azure OpenAI (if using Azure OpenAI) */
  deploymentName?: string;
  /** API version for Azure OpenAI */
  apiVersion?: string;
  /** Whether to enable tool calling for connector/operation lookup (defaults to true) */
  enableTools?: boolean;
  /** Maximum number of tool-calling rounds before forcing a final response (defaults to 5) */
  maxToolRounds?: number;
}

/** Message types used in the OpenAI chat completion API */
type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: undefined }
  | { role: 'assistant'; content: string | null; tool_calls: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export class BaseCopilotWorkflowEditorService implements ICopilotWorkflowEditorService {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly systemPrompt: string;
  private readonly deploymentName?: string;
  private readonly apiVersion?: string;
  private readonly enableTools: boolean;
  private readonly maxToolRounds: number;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(options: CopilotWorkflowEditorServiceOptions) {
    const { endpoint, apiKey } = options;
    if (!endpoint) {
      throw new ArgumentException('endpoint required for CopilotWorkflowEditorService');
    }
    if (!apiKey) {
      throw new ArgumentException('apiKey required for CopilotWorkflowEditorService');
    }

    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.model = options.model ?? 'gpt-4o';
    this.systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    this.deploymentName = options.deploymentName;
    this.apiVersion = options.apiVersion;
    this.enableTools = options.enableTools ?? true;
    this.maxToolRounds = options.maxToolRounds ?? 5;
  }

  async getWorkflowEdit(prompt: string, workflow: Workflow, signal?: AbortSignal): Promise<WorkflowEditResponse> {
    const workflowContext = JSON.stringify(
      {
        definition: workflow.definition,
        kind: workflow.kind,
        connectionReferences: workflow.connectionReferences,
        ...(workflow.parameters && Object.keys(workflow.parameters).length > 0 ? { parameters: workflow.parameters } : {}),
        ...(workflow.notes && Object.keys(workflow.notes).length > 0 ? { notes: workflow.notes } : {}),
      },
      null,
      2
    );

    const userMessage = `[CURRENT WORKFLOW]\n${workflowContext}\n\n[USER REQUEST]\n${prompt}`;

    // Determine which tools are available for this request
    const tools = this._getAvailableTools();

    // Build the messages array for this request — includes persistent history + current turn
    const messages: ChatMessage[] = [
      { role: 'system' as const, content: this.systemPrompt },
      ...this.conversationHistory.map((m) => ({ ...m }) as ChatMessage),
      { role: 'user' as const, content: userMessage },
    ];

    const url = this._buildUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this._buildAuthHeaders(),
    };

    let finalContent = '';

    // Tool-calling loop: the LLM may request tool calls before producing a final response
    for (let round = 0; round <= this.maxToolRounds; round++) {
      const body: Record<string, unknown> = {
        model: this.deploymentName ?? this.model,
        messages,
        temperature: 1.0,
        max_completion_tokens: 16384,
      };

      if (tools.length > 0 && round < this.maxToolRounds) {
        body['tools'] = tools;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const assistantMessage = choice?.message;

      if (!assistantMessage) {
        throw new Error('LLM returned no message in response');
      }

      // Check if the LLM wants to call tools
      const toolCalls = assistantMessage.tool_calls as ToolCall[] | undefined;

      if (toolCalls && toolCalls.length > 0) {
        // Add the assistant's tool-call message to the conversation
        messages.push({
          role: 'assistant' as const,
          content: assistantMessage.content ?? null,
          tool_calls: toolCalls,
        });

        // Execute each tool call and add results
        for (const toolCall of toolCalls) {
          const result = await executeCopilotTool(toolCall.function.name, toolCall.function.arguments);
          messages.push({
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: result,
          });
        }

        // Continue to the next round for the LLM to process tool results
        continue;
      }

      // No tool calls — this is the final response
      finalContent = assistantMessage.content ?? '';
      break;
    }

    // Persist user + final assistant message in conversation history (excluding tool-call internals)
    this.conversationHistory.push({ role: 'user', content: userMessage });
    this.conversationHistory.push({ role: 'assistant', content: finalContent });

    return this._parseResponse(finalContent, workflow);
  }

  /**
   * Returns the tools that should be offered to the LLM.
   * Only returns tools if enableTools is true and the required services are available.
   */
  private _getAvailableTools(): CopilotToolDefinition[] {
    if (!this.enableTools) {
      return [];
    }

    // Check if the required services are initialized by attempting to access them.
    // If they're not available, we skip tools gracefully so the LLM still works (just without lookup).
    try {
      SearchService();
      ConnectionService();
    } catch {
      // Services not initialized — tools won't work, so don't offer them
      return [];
    }

    return COPILOT_WORKFLOW_TOOLS;
  }

  private _buildUrl(): string {
    // Azure OpenAI format
    if (this.deploymentName) {
      const apiVersion = this.apiVersion ?? '2024-08-01-preview';
      return `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${apiVersion}`;
    }
    // Standard OpenAI format
    return `${this.endpoint}/chat/completions`;
  }

  private _buildAuthHeaders(): Record<string, string> {
    if (this.deploymentName) {
      // Azure OpenAI uses api-key header
      return { 'api-key': this.apiKey };
    }
    // Standard OpenAI uses Bearer token
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  private _parseResponse(content: string, currentWorkflow: Workflow): WorkflowEditResponse {
    // Try to extract JSON from a ```json code block
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonBlockMatch ? jsonBlockMatch[1] : content;

    try {
      const parsed = JSON.parse(jsonStr.trim());

      if (parsed.type === 'workflow' && parsed.workflow) {
        const proposedWorkflow: Workflow = {
          definition: parsed.workflow.definition ?? parsed.workflow,
          connectionReferences: parsed.workflow.connectionReferences ?? currentWorkflow.connectionReferences ?? {},
          parameters: parsed.workflow.parameters ?? currentWorkflow.parameters,
          notes: parsed.workflow.notes ?? currentWorkflow.notes,
          kind: parsed.workflow.kind ?? currentWorkflow.kind,
        };

        const changes = this._parseChanges(parsed.changes);

        return {
          type: 'workflow',
          text: parsed.text ?? 'Workflow updated.',
          workflow: proposedWorkflow,
          changes,
        };
      }

      if (parsed.type === 'text') {
        return {
          type: 'text',
          text: parsed.text ?? content,
        };
      }

      // If parsed JSON has a "definition" key directly, treat it as a workflow
      if (parsed.definition) {
        return {
          type: 'workflow',
          text: 'Workflow updated.',
          workflow: {
            definition: parsed.definition,
            connectionReferences: parsed.connectionReferences ?? currentWorkflow.connectionReferences ?? {},
            parameters: parsed.parameters ?? currentWorkflow.parameters,
            notes: parsed.notes ?? currentWorkflow.notes,
            kind: parsed.kind ?? currentWorkflow.kind,
          },
        };
      }

      // Fallback: treat as text
      return { type: 'text', text: parsed.text ?? content };
    } catch {
      // Could not parse JSON — treat entire content as a text reply
      return { type: 'text', text: content };
    }
  }

  private _parseChanges(rawChanges: unknown): WorkflowChange[] | undefined {
    if (!Array.isArray(rawChanges) || rawChanges.length === 0) {
      return undefined;
    }

    const validChangeTypes = new Set<string>(Object.values(WorkflowChangeType));
    const validTargetTypes = new Set<string>(Object.values(WorkflowChangeTargetType));

    return rawChanges
      .filter((c: any): c is any => !!c && typeof c === 'object')
      .map((c: any) => {
        const ct = c.changeType as string | undefined;
        const tt = c.targetType as string | undefined;
        const ids = c.nodeIds as unknown;
        const desc = c.description as unknown;
        return {
          changeType: (ct && validChangeTypes.has(ct) ? ct : WorkflowChangeType.Modified) as WorkflowChangeType,
          targetType: (tt && validTargetTypes.has(tt) ? tt : WorkflowChangeTargetType.Action) as WorkflowChangeTargetType,
          nodeIds: Array.isArray(ids) ? ids.filter((id: unknown): id is string => typeof id === 'string') : [],
          description: typeof desc === 'string' ? desc : 'Change applied',
        };
      });
  }
}
