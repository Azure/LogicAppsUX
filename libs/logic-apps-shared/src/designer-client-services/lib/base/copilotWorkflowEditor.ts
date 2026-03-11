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
  /** Whether to enable tool calling for connector/operation lookup (defaults to true) */
  enableTools?: boolean;
  /** Maximum number of tool-calling rounds before forcing a final response (defaults to 5) */
  maxToolRounds?: number;
}

/** Message types used in the OpenAI Chat Completions API */
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

/** Output item shapes returned by the Responses API */
interface ResponsesApiOutputItem {
  type: 'message' | 'function_call';
  // message fields
  role?: string;
  content?: Array<{ type: string; text?: string }>;
  // function_call fields
  call_id?: string;
  name?: string;
  arguments?: string;
}

export class BaseCopilotWorkflowEditorService implements ICopilotWorkflowEditorService {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly systemPrompt: string;
  private readonly deploymentName?: string;
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

    // Build the full message for the current turn (workflow context + user prompt).
    // Only the user prompt (without the workflow context) is stored in conversation
    // history so that old serialized workflows don't accumulate and bloat the context.
    const userMessage = `[CURRENT WORKFLOW]\n${workflowContext}\n\n[USER REQUEST]\n${prompt}`;
    const tools = this._getAvailableTools();
    const url = this._buildUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this._buildAuthHeaders(),
    };

    let finalContent: string;
    if (this._isResponsesApi()) {
      finalContent = await this._executeResponsesApi(userMessage, tools, url, headers, signal);
    } else {
      finalContent = await this._executeCompletionsApi(userMessage, tools, url, headers, signal);
    }

    // Store only the user prompt (not the workflow context) in history to avoid
    // accumulating large serialized workflows across turns.
    this.conversationHistory.push({ role: 'user', content: prompt });
    this.conversationHistory.push({ role: 'assistant', content: finalContent });

    return this._parseResponse(finalContent, workflow);
  }

  // ---------------------------------------------------------------------------
  // Chat Completions API (/chat/completions)
  // ---------------------------------------------------------------------------

  private async _executeCompletionsApi(
    userMessage: string,
    tools: CopilotToolDefinition[],
    url: string,
    headers: Record<string, string>,
    signal?: AbortSignal
  ): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system' as const, content: this.systemPrompt },
      ...this.conversationHistory.map((m) => ({ ...m }) as ChatMessage),
      { role: 'user' as const, content: userMessage },
    ];

    let finalContent = '';

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

      const toolCalls = assistantMessage.tool_calls as ToolCall[] | undefined;

      if (toolCalls && toolCalls.length > 0) {
        messages.push({
          role: 'assistant' as const,
          content: assistantMessage.content ?? null,
          tool_calls: toolCalls,
        });

        for (const toolCall of toolCalls) {
          const result = await executeCopilotTool(toolCall.function.name, toolCall.function.arguments);
          messages.push({
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: result,
          });
        }
        continue;
      }

      finalContent = assistantMessage.content ?? '';
      break;
    }

    return finalContent;
  }

  // ---------------------------------------------------------------------------
  // Responses API (/responses)
  // ---------------------------------------------------------------------------

  private async _executeResponsesApi(
    userMessage: string,
    tools: CopilotToolDefinition[],
    url: string,
    headers: Record<string, string>,
    signal?: AbortSignal
  ): Promise<string> {
    // Build initial input from conversation history + current user message
    const input: Record<string, unknown>[] = [
      ...this.conversationHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    // Transform tools from Chat Completions format → Responses API format (flat)
    const responsesTools = tools.map((t) => ({
      type: 'function' as const,
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));

    let previousResponseId: string | undefined;
    let pendingToolOutputs: Record<string, unknown>[] | undefined;
    let finalContent = '';

    for (let round = 0; round <= this.maxToolRounds; round++) {
      const body: Record<string, unknown> = {
        model: this.deploymentName ?? this.model,
        instructions: this.systemPrompt,
        temperature: 1.0,
        max_output_tokens: 16384,
      };

      if (previousResponseId && pendingToolOutputs) {
        // Subsequent round: reference previous response + send tool outputs
        body['previous_response_id'] = previousResponseId;
        body['input'] = pendingToolOutputs;
      } else {
        // First round: send full input
        body['input'] = input;
      }

      if (responsesTools.length > 0 && round < this.maxToolRounds) {
        body['tools'] = responsesTools;
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
      previousResponseId = data.id;
      const outputItems: ResponsesApiOutputItem[] = data.output ?? [];
      const functionCalls = outputItems.filter((item) => item.type === 'function_call');

      if (functionCalls.length > 0 && round < this.maxToolRounds) {
        // Execute each tool call and prepare results for the next round
        pendingToolOutputs = [];
        for (const fc of functionCalls) {
          const result = await executeCopilotTool(fc.name!, fc.arguments!);
          pendingToolOutputs.push({
            type: 'function_call_output',
            call_id: fc.call_id,
            output: result,
          });
        }
        continue;
      }

      // Extract text content from message output items
      for (const item of outputItems) {
        if (item.type === 'message' && item.content) {
          for (const block of item.content) {
            if (block.type === 'output_text' && block.text) {
              finalContent += block.text;
            }
          }
        }
      }
      break;
    }

    return finalContent;
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
    return this.endpoint;
  }

  /** Detect whether the configured endpoint uses the Responses API (`/responses`) */
  private _isResponsesApi(): boolean {
    return this.endpoint.includes('/responses');
  }

  private _buildAuthHeaders(): Record<string, string> {
    if (this.deploymentName) {
      // Azure OpenAI uses api-key header
      return { 'api-key': this.apiKey };
    }
    // Standard OpenAI uses Bearer token
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  /**
   * Strip JavaScript-style comments from a string so that JSON.parse can succeed
   * even when the LLM injects comments into its JSON output.
   */
  private _stripJsonComments(str: string): string {
    // Remove single-line comments (// …) that are NOT inside strings.
    // We walk through the string tracking whether we're inside a JSON string value.
    let result = '';
    let inString = false;
    let i = 0;
    while (i < str.length) {
      const ch = str[i];
      if (inString) {
        result += ch;
        // Skip escaped characters inside strings
        if (ch === '\\' && i + 1 < str.length) {
          i++;
          result += str[i];
        } else if (ch === '"') {
          inString = false;
        }
      } else if (ch === '"') {
        inString = true;
        result += ch;
      } else if (ch === '/' && i + 1 < str.length && str[i + 1] === '/') {
        // Single-line comment — skip until end of line
        i += 2;
        while (i < str.length && str[i] !== '\n') {
          i++;
        }
        continue; // don't increment i again at the bottom
      } else if (ch === '/' && i + 1 < str.length && str[i + 1] === '*') {
        // Block comment — skip until */
        i += 2;
        while (i < str.length && !(str[i] === '*' && i + 1 < str.length && str[i + 1] === '/')) {
          i++;
        }
        i += 2; // skip the closing */
        continue;
      } else {
        result += ch;
      }
      i++;
    }
    return result;
  }

  private _parseResponse(content: string, currentWorkflow: Workflow): WorkflowEditResponse {
    // Try to extract JSON from a ```json code block
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonBlockMatch ? jsonBlockMatch[1] : content;

    try {
      // Strip JS-style comments that LLMs sometimes inject (// … and /* … */)
      const cleanedJson = this._stripJsonComments(jsonStr.trim());
      const parsed = JSON.parse(cleanedJson);

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
