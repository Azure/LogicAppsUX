import type { ICopilotWorkflowEditorService, WorkflowEditResponse } from '../copilotWorkflowEditor';
import type { Workflow } from '../../../utils/src';
import { ArgumentException } from '../../../utils/src';

const DEFAULT_SYSTEM_PROMPT = `You are a workflow assistant for Azure Logic Apps. You can answer questions about workflows AND modify workflow definitions based on user requests.

## RESPONSE FORMAT

You MUST respond with a valid JSON object in one of these two formats:

### For workflow modifications:
\`\`\`json
{
  "type": "workflow",
  "text": "Brief description of what you changed",
  "workflow": {
    "definition": { ... },
    "kind": "Stateful"
  }
}
\`\`\`

### For questions / non-modification requests:
\`\`\`json
{
  "type": "text",
  "text": "Your answer here"
}
\`\`\`

## WORKFLOW RULES

You are generating workflows for Azure Logic Apps STANDARD SKU (not Consumption SKU).

Standard SKU rules:
- The workflow definition should contain the "definition" object with triggers and actions
- Do NOT include "parameters" with connection references in the definition
- Do NOT include "connections" or "$connections" in the workflow definition
- NEVER use parameters('$connections') - this pattern does NOT exist in Standard SKU
- For actions that need connections, use this format:
  "inputs": {
    "host": {
      "connection": {
        "referenceName": "connectionName"
      }
    }
  }
- Preserve existing connectionReferences from the current workflow when possible
- Keep the same "kind" value unless the user explicitly asks to change it

## WHEN MODIFYING A WORKFLOW

1. Start from the provided current workflow definition
2. Apply ONLY the changes the user requested
3. Preserve all existing actions, triggers, and structure unless explicitly asked to change them
4. Preserve all existing "runAfter" dependencies
5. When adding a new action that should run after existing actions, set appropriate "runAfter"
6. Return the COMPLETE modified workflow definition (not just the changed parts)

## WHEN ANSWERING QUESTIONS

- Answer clearly and concisely
- You can answer questions about Azure Logic Apps, workflows, actions, triggers, expressions, and connectors
- If the user asks about the current workflow, reference the workflow context provided

## IMPORTANT

- Always respond with valid JSON wrapped in a \`\`\`json code block
- Never include explanatory text outside the JSON response
- The "text" field supports markdown formatting`;

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
}

export class BaseCopilotWorkflowEditorService implements ICopilotWorkflowEditorService {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly systemPrompt: string;
  private readonly deploymentName?: string;
  private readonly apiVersion?: string;
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
  }

  async getWorkflowEdit(prompt: string, workflow: Workflow, signal?: AbortSignal): Promise<WorkflowEditResponse> {
    const workflowContext = JSON.stringify(
      {
        definition: workflow.definition,
        kind: workflow.kind,
        connectionReferences: workflow.connectionReferences,
      },
      null,
      2
    );

    const userMessage = `[CURRENT WORKFLOW]\n${workflowContext}\n\n[USER REQUEST]\n${prompt}`;

    this.conversationHistory.push({ role: 'user', content: userMessage });

    const url = this._buildUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this._buildAuthHeaders(),
    };

    const body = {
      model: this.deploymentName ?? this.model,
      messages: [{ role: 'system' as const, content: this.systemPrompt }, ...this.conversationHistory],
      temperature: 1.0,
      max_completion_tokens: 16384,
    };

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
    const assistantContent = data.choices?.[0]?.message?.content ?? '';

    this.conversationHistory.push({ role: 'assistant', content: assistantContent });

    return this._parseResponse(assistantContent, workflow);
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
          kind: parsed.workflow.kind ?? currentWorkflow.kind,
        };

        return {
          type: 'workflow',
          text: parsed.text ?? 'Workflow updated.',
          workflow: proposedWorkflow,
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
}
