/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';
import * as fse from 'fs-extra';
import { CHAT_PARTICIPANT_ID, ChatCommand, ToolName, WorkflowTypeOption, ProjectTypeOption, TargetFrameworkOption } from './chatConstants';
import { registerWorkflowTools, registerProjectTools } from './tools';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { extensionCommand, workflowFileName, WorkflowType } from '../../constants';
import { createLogicAppProject } from '../commands/createNewCodeProject/CodeProjectBase/CreateLogicAppProjects';
import { ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { writeFormattedJson } from '../utils/fs';
import { getCodelessWorkflowTemplate } from '../utils/codeless/templates';

/**
 * Chat result metadata for tracking follow-ups
 */
interface LogicAppsChatResult extends vscode.ChatResult {
  metadata: {
    command?: string;
    workflowName?: string;
    projectName?: string;
    needsParameter?: string;
    workflows?: WorkflowSpec[];
    targetProject?: string;
    pendingWorkflows?: WorkflowSpec[];
    includeCustomCode?: boolean;
    projectType?: ProjectTypeOption;
    targetFramework?: TargetFrameworkOption;
    functionName?: string;
    functionNamespace?: string;
    pendingModificationPrompt?: string;
    pendingProjectNames?: string[];
  };
}

/**
 * Logic App project information
 */
interface LogicAppProject {
  name: string;
  path: string;
}

/**
 * Specification for a workflow to create
 */
export interface WorkflowSpec {
  name: string;
  type?: WorkflowTypeOption;
}

/**
 * Prompt templates for the chat participant
 */
const SYSTEM_PROMPT = `You are an Azure Logic Apps assistant. Your job is to understand what the user wants and call the appropriate tool.

AVAILABLE ACTIONS:
1. CREATE_PROJECT - Create a new Logic App project
2. CREATE_WORKFLOWS - Create one or more workflows in an existing project
3. MODIFY_ACTION - Modify an action in a workflow
4. HELP - Show help information

When users want to create workflows, extract:
- Workflow names (can be a range like "Order4-8" meaning Order4, Order5, Order6, Order7, Order8)
- Workflow type: stateful (default), stateless, agentic, or agent
- Count if specified (e.g., "5 workflows")

When users want to create a project, extract:
- Project name
- Whether they want custom code support
- Initial workflow specifications

IMPORTANT: Always use the tools provided to execute actions. Do not just describe what you would do.`;

const RESPONSE_GUARDRAILS = `
- Do not fabricate local file paths or clickable markdown links to workspace files.
- Only mention plain filenames (for example, connections.json) unless a tool returned an exact file path.
`;

/**
 * Extracted intent from user prompt
 * @internal Exported for testing
 */
export interface ParsedIntent {
  action: 'createProject' | 'createWorkflows' | 'modifyAction' | 'help' | 'unknown';
  projectName?: string;
  workflows?: WorkflowSpec[];
  targetProject?: string;
  includeCustomCode?: boolean;
  projectType?: ProjectTypeOption;
  targetFramework?: TargetFrameworkOption;
  functionName?: string;
  functionNamespace?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Register the Logic Apps chat participant
 */
export function registerChatParticipant(context: vscode.ExtensionContext): void {
  // Register language model tools
  registerWorkflowTools(context);
  registerProjectTools(context);

  // Create the chat participant
  const participant = vscode.chat.createChatParticipant(CHAT_PARTICIPANT_ID, handleChatRequest);

  // Set participant properties
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'assets', 'dark', 'LogicApp.svg');

  // Register follow-up provider
  participant.followupProvider = {
    provideFollowups(result: LogicAppsChatResult, _context: vscode.ChatContext, _token: vscode.CancellationToken) {
      const followups: vscode.ChatFollowup[] = [];

      if (result.metadata?.command === ChatCommand.createProject) {
        followups.push({
          prompt: 'Create a stateful workflow in this project',
          label: localize('followupCreateWorkflow', 'Create a workflow'),
        });
      } else if (result.metadata?.command === ChatCommand.createWorkflow) {
        followups.push({
          prompt: `Open the ${result.metadata.workflowName} workflow in the designer`,
          label: localize('followupOpenDesigner', 'Open in designer'),
        });
        followups.push({
          prompt: `Add an HTTP trigger to ${result.metadata.workflowName}`,
          label: localize('followupAddTrigger', 'Add a trigger'),
        });
      } else if (result.metadata?.needsParameter) {
        // Provide suggestions for missing parameters
        if (result.metadata.needsParameter === 'workflowType') {
          followups.push(
            { prompt: 'Create a stateful workflow', label: 'Stateful' },
            { prompt: 'Create a stateless workflow', label: 'Stateless' },
            { prompt: 'Create an agentic workflow', label: 'Autonomous Agent' },
            { prompt: 'Create a conversational agent workflow', label: 'Conversational Agent' }
          );
        } else if (result.metadata.needsParameter === 'projectType') {
          followups.push(
            { prompt: 'Create a standard Logic App project', label: 'Standard' },
            { prompt: 'Create a Logic App project with custom code support', label: 'With Custom Code' }
          );
        }
      } else {
        // Default follow-ups
        followups.push({
          prompt: 'What can you help me with?',
          label: localize('followupHelp', 'Show help'),
        });
      }

      return followups;
    },
  };

  context.subscriptions.push(participant);

  ext.outputChannel.appendLine('Logic Apps chat participant registered successfully');
}

/**
 * Handle incoming chat requests
 *
 * HYBRID APPROACH:
 * 1. Use LLM (when available) to understand intent and extract parameters
 * 2. Fall back to explicit parsing for common patterns
 * 3. Route to explicit handlers for actual execution
 * 4. Handlers manage state and collect missing parameters
 */
async function handleChatRequest(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<LogicAppsChatResult> {
  // Handle explicit slash commands directly
  if (request.command === ChatCommand.createWorkflow) {
    return await handleCreateWorkflowCommand(request, context, stream, token);
  }

  if (request.command === ChatCommand.createProject) {
    return await handleCreateProjectCommand(request, context, stream, token);
  }

  if (request.command === ChatCommand.modifyAction) {
    return await handleModifyActionCommand(request, context, stream, token);
  }

  if (request.command === ChatCommand.help) {
    return await handleHelpCommand(stream);
  }

  // Check if user is responding to a pending question (state machine)
  const lastResult = getLastChatResult(context);

  // Prioritize modify-action continuations to avoid stale create state hijacking follow-up replies
  if (lastResult?.metadata?.needsParameter && lastResult.metadata.command === ChatCommand.modifyAction) {
    return await handleModifyActionCommand(request, context, stream, token);
  }

  // Prioritize explicit modify prompts over pending create states
  const explicitIntent = parseIntentFromPrompt(request.prompt);
  if (explicitIntent.action === 'modifyAction') {
    const parsedIntent = await parseIntent(request, context, stream, token);
    const modifyIntent = parsedIntent.action === 'modifyAction' ? parsedIntent : explicitIntent;
    return await handleModifyActionCommand(request, context, stream, token, modifyIntent);
  }

  if (lastResult?.metadata?.needsParameter) {
    if (lastResult.metadata.command === ChatCommand.createWorkflow) {
      return await handleCreateWorkflowCommand(request, context, stream, token);
    }

    if (lastResult.metadata.command === ChatCommand.createProject) {
      return await handleCreateProjectCommand(request, context, stream, token);
    }
  }

  // Parse intent - try LLM first, fall back to explicit parsing
  const intent = await parseIntent(request, context, stream, token);

  // Route to explicit handlers based on intent
  switch (intent.action) {
    case 'createProject':
      return await handleCreateProjectCommand(request, context, stream, token, intent);
    case 'createWorkflows':
      return await handleCreateWorkflowCommand(request, context, stream, token, intent);
    case 'modifyAction':
      return await handleModifyActionCommand(request, context, stream, token, intent);
    case 'help':
      return await handleHelpCommand(stream);
    default:
      // Unknown intent - let LLM handle conversationally
      return await handleGeneralRequest(request, context, stream, token);
  }
}

/**
 * Parse user intent from prompt text - pure function for testing
 * @internal Exported for testing
 */
export function parseIntentFromPrompt(prompt: string): ParsedIntent {
  const lowerPrompt = prompt.toLowerCase();

  // Fast path: Explicit pattern matching for common intents
  // This works without LLM and handles most cases

  // Check for workflow creation first - adding workflows to existing project
  // "logic app workflow" is a compound term meaning workflow creation
  if (lowerPrompt.includes('logic app workflow')) {
    return { action: 'createWorkflows', confidence: 'high' };
  }

  // "add/create workflow to/in/under [project]" = adding to existing project
  if (
    (lowerPrompt.includes('add') || lowerPrompt.includes('create') || lowerPrompt.includes('new')) &&
    lowerPrompt.includes('workflow') &&
    (lowerPrompt.includes('to the project') ||
      lowerPrompt.includes('to project') ||
      lowerPrompt.includes('to my project') ||
      /(?:under|in|into|for)\s+[A-Z]/i.test(prompt))
  ) {
    return { action: 'createWorkflows', confidence: 'high' };
  }

  // Check for project creation - "create logic app" is always project creation
  // even if workflows are mentioned (they're part of the new project)
  // Also detect rules engine and custom code patterns as project creation
  if (
    (lowerPrompt.includes('create') || lowerPrompt.includes('new')) &&
    (lowerPrompt.includes('project') ||
      lowerPrompt.includes('workspace') ||
      lowerPrompt.includes('logic app') ||
      lowerPrompt.includes('rules engine') ||
      lowerPrompt.includes('rule engine') ||
      lowerPrompt.includes('custom code'))
  ) {
    return { action: 'createProject', confidence: 'high' };
  }

  // Check for workflow creation - creating/adding workflows
  if ((lowerPrompt.includes('create') || lowerPrompt.includes('new') || lowerPrompt.includes('add')) && lowerPrompt.includes('workflow')) {
    return { action: 'createWorkflows', confidence: 'high' };
  }

  // Check for workflow range pattern (e.g., "Order4-8", "5 workflows") - adding to existing
  if (/\d+\s*(additional\s+)?workflows?/i.test(prompt) || /[A-Za-z]+\d+-\d+/.test(prompt)) {
    return { action: 'createWorkflows', confidence: 'high' };
  }

  // Check for modification intent
  if (lowerPrompt.includes('modify') || lowerPrompt.includes('change') || lowerPrompt.includes('update')) {
    return { action: 'modifyAction', confidence: 'medium' };
  }

  // Check for help
  if (lowerPrompt.includes('help') || lowerPrompt.includes('what can you')) {
    return { action: 'help', confidence: 'high' };
  }

  // Low confidence - will fall through to LLM
  return { action: 'unknown', confidence: 'low' };
}

/**
 * Parse user intent - wrapper that uses the pure function
 */
async function parseIntent(
  request: vscode.ChatRequest,
  _context: vscode.ChatContext,
  _stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<ParsedIntent> {
  // Try LLM first for comprehensive understanding of intent + parameters
  if (request.model) {
    const llmIntent = await parseRequestWithLLM(request, token);
    if (llmIntent && llmIntent.action !== 'unknown') {
      return llmIntent;
    }
  }

  // Fall back to regex-based parsing (fast, no LLM needed)
  return parseIntentFromPrompt(request.prompt);
}

/**
 * Use LLM to parse the full intent and all parameters from a user prompt in one call.
 * This replaces complex regex patterns with natural language understanding.
 * Falls back gracefully if LLM is unavailable.
 */
async function parseRequestWithLLM(request: vscode.ChatRequest, token: vscode.CancellationToken): Promise<ParsedIntent | undefined> {
  if (!request.model) {
    return undefined;
  }

  try {
    const messages = [
      vscode.LanguageModelChatMessage.User(
        `You are parsing a user request for Azure Logic Apps. Analyze the request and extract structured data.

Return a JSON object with these fields:
- "action": One of "createProject", "createWorkflows", "modifyAction", "help", "unknown"
  - "createProject": user wants to create a new Logic App project/app
  - "createWorkflows": user wants to add workflows to an existing project
  - "modifyAction": user wants to modify/change/update an existing workflow action
  - "help": user asks for help or capabilities
- "projectName": Name of a NEW project to create (only for createProject action)
- "targetProject": Name of an EXISTING project context for createWorkflows OR modifyAction (from phrases like "under TonyProject", "in MyApp", "for ProjectX")
- "workflows": Array of workflow objects, each with:
  - "name": string - the workflow name
  - "type": "stateful" | "stateless" | "agentic" | "agent" (OMIT if user didn't specify a type)
- "projectType": One of "logicApp", "logicAppCustomCode", "rulesEngine". Detect from:
  - "rules engine" or "rules" or "business rules" → "rulesEngine"
  - "custom code" or "C#" or ".NET" or "dotnet" or "functions" → "logicAppCustomCode"
  - Otherwise → "logicApp"
- "includeCustomCode": true if projectType is "logicAppCustomCode" or "rulesEngine"
- "targetFramework": Only for customCode projects. "net8" (default) or "net472" (if user says ".NET Framework", "NetFx", "net472", or "Framework")
- "functionName": Only for customCode/rulesEngine. The C# function/method name if specified (e.g. "function called ProcessOrder"). Default to project name + "Functions" if not specified but project is customCode/rulesEngine.
- "functionNamespace": Only for customCode/rulesEngine. The C# namespace if specified. Default to project name + ".Functions" if not specified but project is customCode/rulesEngine.

IMPORTANT rules for extracting workflow names:
- "5 stateful workflows from Stateful1-5" → Stateful1, Stateful2, Stateful3, Stateful4, Stateful5 (all stateful)
- "5 stateful workflows from Stateful1 to Stateful5" → same as above
- "Order4-8" → Order4, Order5, Order6, Order7, Order8
- "3 workflows called Order" → Order1, Order2, Order3
- "a workflow called OrderProcessor" → just OrderProcessor
- "5 stateful workflows under TonyProject from Stateful1-5" → targetProject is "TonyProject", workflows are Stateful1-5

User request: "${request.prompt}"

Respond with ONLY a JSON object, no explanation or markdown.`
      ),
    ];

    const response = await request.model.sendRequest(messages, {}, token);

    let responseText = '';
    for await (const part of response.stream) {
      if (part instanceof vscode.LanguageModelTextPart) {
        responseText += part.value;
      }
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Map workflow types to our enum
      if (parsed.workflows && Array.isArray(parsed.workflows)) {
        parsed.workflows = parsed.workflows.map((w: { name: string; type?: string }) => ({
          name: w.name,
          type: w.type ? mapExtractedType(w.type) : undefined,
        }));
      }

      return {
        action: parsed.action || 'unknown',
        projectName: parsed.projectName,
        targetProject: parsed.targetProject,
        workflows: parsed.workflows,
        includeCustomCode: parsed.includeCustomCode,
        projectType: mapParsedProjectType(parsed.projectType),
        targetFramework: mapParsedTargetFramework(parsed.targetFramework),
        functionName: parsed.functionName,
        functionNamespace: parsed.functionNamespace,
        confidence: 'high',
      };
    }
  } catch {
    // LLM unavailable or failed, fall back to regex
  }

  return undefined;
}

/**
 * Check if a response is a confirmation (yes, sure, ok, etc.)
 * @internal Exported for testing
 */
export function isConfirmationResponse(prompt: string): boolean {
  const confirmations = [
    'yes',
    'yeah',
    'yep',
    'yup',
    'sure',
    'ok',
    'okay',
    'sounds good',
    'go ahead',
    'do it',
    'please',
    'thanks',
    'that works',
    'perfect',
    'great',
    'fine',
    'correct',
    'right',
  ];
  const lower = prompt.toLowerCase().trim();
  return confirmations.some((c) => lower === c || lower.startsWith(`${c} `) || lower.endsWith(` ${c}`));
}

function normalizeProjectToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Extract project names from ambiguity response text:
 * Workflow "X" exists in multiple projects...\n- ProjectA\n- ProjectB
 * @internal Exported for testing
 */
export function extractProjectNamesFromAmbiguityResponse(text: string): string[] {
  const projectNames: string[] = [];
  const bulletRegex = /^\s*(?:-|\*|•)\s*([A-Za-z][A-Za-z0-9_-]*)\s*$/gm;

  let match: RegExpExecArray | null;
  while ((match = bulletRegex.exec(text)) !== null) {
    const projectName = match[1];
    if (!projectNames.includes(projectName)) {
      projectNames.push(projectName);
    }
  }

  return projectNames;
}

/**
 * Resolve a user's project selection response against available project names.
 * Supports exact, case-insensitive, punctuation-tolerant, and contextual matches.
 * @internal Exported for testing
 */
export function resolveSelectedProjectName(response: string, projectNames: string[]): string | undefined {
  const sanitizedResponse = response.replace(/^\s*@logicapps\s*/i, '').trim();
  if (!sanitizedResponse || projectNames.length === 0) {
    return undefined;
  }

  const exactMatch = projectNames.find((name) => name.toLowerCase() === sanitizedResponse.toLowerCase());
  if (exactMatch) {
    return exactMatch;
  }

  const normalizedResponse = normalizeProjectToken(sanitizedResponse);
  if (!normalizedResponse) {
    return undefined;
  }

  const normalizedMatches = projectNames.filter((name) => {
    const normalizedName = normalizeProjectToken(name);
    return normalizedResponse.includes(normalizedName) || normalizedName.includes(normalizedResponse);
  });

  if (normalizedMatches.length === 1) {
    return normalizedMatches[0];
  }

  return undefined;
}

/**
 * Extract an existing project name from freeform modify prompts.
 * @internal Exported for testing
 */
export function extractTargetProjectFromPrompt(prompt: string): string | undefined {
  const explicitContextMatch = prompt.match(/\bin\s+([A-Z][A-Za-z0-9_-]*)\s*,\s*Workflow/i);
  if (explicitContextMatch?.[1]) {
    return explicitContextMatch[1];
  }

  const candidates = Array.from(prompt.matchAll(/\b(?:in|under|within|inside|project)\s+([A-Z][A-Za-z0-9_-]*)\b/g), (match) => match[1]);

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (/^workflow\d*$/i.test(candidate)) {
      continue;
    }

    return candidate;
  }

  return undefined;
}

interface InvokableTool {
  name: string;
  description?: string;
  inputSchema?: object;
}

interface ToolOrchestrationResult {
  toolResponseText: string;
  invokedToolNames: string[];
  mutationApplied: boolean;
  requestedProjectDisambiguation: boolean;
}

const workflowProjectScopedTools = new Set<string>([
  ToolName.getWorkflowDefinition,
  ToolName.addAction,
  ToolName.modifyAction,
  ToolName.deleteAction,
]);

const mutatingWorkflowTools = new Set<string>([ToolName.addAction, ToolName.modifyAction, ToolName.deleteAction]);

const readOnlyWorkflowTools = new Set<string>([ToolName.getWorkflowDefinition, ToolName.listWorkflows]);

function withForcedProjectNameOnToolInput(toolName: string, input: object, forcedProjectName?: string): object {
  if (!forcedProjectName) {
    return input;
  }

  if (!workflowProjectScopedTools.has(toolName)) {
    return input;
  }

  if (typeof input !== 'object' || input === null) {
    return input;
  }

  const inputRecord = { ...(input as Record<string, unknown>) };
  if (typeof inputRecord.workflowName !== 'string') {
    return input;
  }

  if (typeof inputRecord.projectName === 'string' && inputRecord.projectName.trim()) {
    return inputRecord;
  }

  inputRecord.projectName = forcedProjectName;
  return inputRecord;
}

function coerceToolInputToObject(input: unknown): object {
  if (typeof input === 'object' && input !== null) {
    return input;
  }

  return {};
}

function getToolCallSignature(toolName: string, input: unknown): string {
  try {
    return `${toolName}:${JSON.stringify(input)}`;
  } catch {
    return `${toolName}:${String(input)}`;
  }
}

async function runToolOrchestration(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  tools: readonly InvokableTool[],
  initialMessages: vscode.LanguageModelChatMessage[],
  options?: {
    forcedProjectName?: string;
    maxIterations?: number;
    requireMutation?: boolean;
    mutationNudge?: string;
  }
): Promise<ToolOrchestrationResult> {
  if (!request.model) {
    return {
      toolResponseText: '',
      invokedToolNames: [],
      mutationApplied: false,
      requestedProjectDisambiguation: false,
    };
  }

  const messages = [...initialMessages];
  const maxIterations = options?.maxIterations ?? 4;
  const calledSignatures = new Set<string>();

  const invokedToolNames: string[] = [];
  let toolResponseText = '';
  let mutationApplied = false;
  let readToolUsed = false;
  let requestedProjectDisambiguation = false;
  let mutationNudgeSent = false;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await request.model.sendRequest(
      messages,
      {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      },
      token
    );

    let assistantText = '';
    const toolCalls: Array<{ name: string; input: unknown }> = [];

    for await (const part of response.stream) {
      if (part instanceof vscode.LanguageModelTextPart) {
        stream.markdown(part.value);
        assistantText += part.value;
      } else if (part instanceof vscode.LanguageModelToolCallPart) {
        toolCalls.push({ name: part.name, input: part.input });
      }
    }

    if (assistantText.trim()) {
      messages.push(vscode.LanguageModelChatMessage.Assistant(assistantText));
    }

    if (toolCalls.length === 0) {
      if (options?.requireMutation && readToolUsed && !mutationApplied && !mutationNudgeSent) {
        messages.push(
          vscode.LanguageModelChatMessage.User(
            options.mutationNudge ?? 'You have inspected the workflow. Apply the requested change now by calling a mutating workflow tool.'
          )
        );
        mutationNudgeSent = true;
        continue;
      }

      break;
    }

    let executedAnyTool = false;

    for (const toolCall of toolCalls) {
      stream.progress(localize('executingTool', 'Executing...'));

      const baseInput = coerceToolInputToObject(toolCall.input);
      const toolInput = withForcedProjectNameOnToolInput(toolCall.name, baseInput, options?.forcedProjectName);

      const signature = getToolCallSignature(toolCall.name, toolInput);
      if (calledSignatures.has(signature)) {
        continue;
      }

      calledSignatures.add(signature);
      executedAnyTool = true;
      invokedToolNames.push(toolCall.name);

      if (mutatingWorkflowTools.has(toolCall.name)) {
        mutationApplied = true;
      }

      if (readOnlyWorkflowTools.has(toolCall.name)) {
        readToolUsed = true;
      }

      const result = await vscode.lm.invokeTool(
        toolCall.name,
        { input: toolInput, toolInvocationToken: request.toolInvocationToken },
        token
      );

      let toolText = '';
      for (const content of result.content) {
        if (content instanceof vscode.LanguageModelTextPart) {
          stream.markdown(content.value);
          toolText += `\n${content.value}`;
        }
      }

      if (toolText.trim()) {
        toolResponseText += toolText;
        messages.push(
          vscode.LanguageModelChatMessage.User(
            `Tool ${toolCall.name} result:\n${toolText}\nContinue only if more tool actions are required.`
          )
        );
      }

      if (/please specify projectname/i.test(toolText)) {
        requestedProjectDisambiguation = true;
      }
    }

    if (!executedAnyTool || requestedProjectDisambiguation) {
      break;
    }
  }

  return {
    toolResponseText,
    invokedToolNames,
    mutationApplied,
    requestedProjectDisambiguation,
  };
}

/**
 * Extracted conversational response from LLM
 */
interface ConversationalResponse {
  projectName?: string;
  workflows?: WorkflowSpec[];
  workflowType?: WorkflowTypeOption;
  targetProject?: string;
  confirmed?: boolean;
}

/**
 * Use LLM to understand a conversational response when we're waiting for a parameter
 * This handles natural language responses like:
 * - "Name it MyLogicApp" → {projectName: "MyLogicApp"}
 * - "sure" → {confirmed: true}
 * - "5 stateful workflows" → {workflows: [...]}
 */
async function extractConversationalResponse(
  request: vscode.ChatRequest,
  lastResult: LogicAppsChatResult,
  token: vscode.CancellationToken
): Promise<ConversationalResponse | undefined> {
  if (!request.model) {
    return undefined;
  }

  const needsParameter = lastResult.metadata.needsParameter;

  let extractionPrompt = '';

  switch (needsParameter) {
    case 'projectName':
      extractionPrompt = `The user was asked to provide a project name for a Logic App.
Extract the project name from their response. 
If they're confirming/agreeing without providing a name (e.g., "sure", "yes", "ok"), set "confirmed" to true.
If they say something like "Name it X" or "Call it X", extract X as the projectName.
Return JSON: {"projectName": "ExtractedName"} or {"confirmed": true}`;
      break;

    case 'workflows':
      extractionPrompt = `The user was asked to specify what workflows to create.
Extract workflow specifications from their response.
Workflow types: stateful, stateless, agentic, agent
Handle patterns like:
- "a stateful workflow called OrderProcessor"
- "5 stateful workflows from Order1 to Order5"  
- "default" means one stateful workflow called Workflow1
Return JSON: {"workflows": [{"name": "WorkflowName", "type": "stateful"}]}`;
      break;

    case 'workflowType':
      extractionPrompt = `The user was asked to select a workflow type.
Valid types: stateful, stateless, agentic, agent
Extract which type they chose from their response.
Return JSON: {"workflowType": "stateful"}`;
      break;

    case 'targetProject':
      extractionPrompt = `The user was asked which Logic App project to use.
Extract the project name they selected from their response.
Return JSON: {"targetProject": "ProjectName"}`;
      break;

    default:
      return undefined;
  }

  try {
    const messages = [
      vscode.LanguageModelChatMessage.User(
        `${extractionPrompt}\n\nUser response: "${request.prompt}"\n\nRespond with ONLY a JSON object, no explanation.`
      ),
    ];

    const response = await request.model.sendRequest(messages, {}, token);

    let responseText = '';
    for await (const part of response.stream) {
      if (part instanceof vscode.LanguageModelTextPart) {
        responseText += part.value;
      }
    }

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Map workflowType string to WorkflowTypeOption
      if (parsed.workflowType && typeof parsed.workflowType === 'string') {
        parsed.workflowType = mapExtractedType(parsed.workflowType);
      }

      // Map workflow types in array
      if (parsed.workflows && Array.isArray(parsed.workflows)) {
        parsed.workflows = parsed.workflows.map((w: { name: string; type: string }) => ({
          name: w.name,
          type: mapExtractedType(w.type) || WorkflowTypeOption.stateful,
        }));
      }

      return parsed as ConversationalResponse;
    }
  } catch {
    // LLM extraction failed, return undefined
  }

  return undefined;
}

/**
 * Handle /createWorkflow command
 */
async function handleCreateWorkflowCommand(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  intent?: ParsedIntent
): Promise<LogicAppsChatResult> {
  stream.progress(localize('analyzingRequest', 'Analyzing your request...'));

  // Check if user is responding to a project selection question
  const lastResult = getLastChatResult(context);
  if (lastResult?.metadata?.needsParameter === 'targetProject' && lastResult?.metadata?.pendingWorkflows) {
    return await handleProjectSelectionResponse(request, lastResult, stream, token);
  }

  // Check if user is responding to a workflow type question
  if (lastResult?.metadata?.needsParameter === 'workflowType' && lastResult?.metadata?.pendingWorkflows) {
    return await handleWorkflowTypeResponse(request, lastResult, stream, token);
  }

  // --- LLM-first parsing ---
  // Use pre-parsed intent from parseIntent() if available (already did LLM call)
  let workflows: WorkflowSpec[] = intent?.workflows ?? [];
  let specifiedProject: string | undefined = intent?.targetProject;
  let workflowName: string | undefined;

  // If no pre-parsed intent (e.g., slash command), try LLM extraction directly
  if (workflows.length === 0 && !intent && request.model) {
    const llmIntent = await parseRequestWithLLM(request, token);
    if (llmIntent) {
      workflows = llmIntent.workflows ?? [];
      specifiedProject = specifiedProject ?? llmIntent.targetProject;
    }
  }

  // --- Regex fallback (when LLM is unavailable or didn't extract) ---
  if (workflows.length === 0) {
    // Extract target project name from the prompt (e.g., "under TonyProject", "in MyApp")
    if (!specifiedProject) {
      const projectRefMatch = request.prompt.match(/(?:under|in|into|for|to)\s+([A-Z][a-zA-Z0-9_-]+)/i);
      if (projectRefMatch) {
        const candidate = projectRefMatch[1];
        if (!['Stateful', 'Stateless', 'Agentic', 'Agent', 'Workflow', 'The', 'This', 'My'].includes(candidate)) {
          specifiedProject = candidate;
        }
      }
    }

    // Try parseWorkflowSpecs (handles range patterns, named lists, etc.)
    workflows = parseWorkflowSpecs(request.prompt);

    // Try additional patterns (Order4-8 shorthand)
    if (workflows.length === 0) {
      const { workflows: additionalWorkflows, baseName } = parseAdditionalWorkflowSpecs(request.prompt);
      workflows = additionalWorkflows;
      workflowName = baseName;
    }

    // Try basic single workflow extraction
    if (workflows.length === 0) {
      const { name, type } = parseWorkflowRequest(request.prompt);
      if (name) {
        workflowName = name;
        if (type) {
          workflows = [{ name, type }];
        }
      }
    }
  }

  if (workflows.length === 0 && !workflowName) {
    stream.markdown(
      localize(
        'workflowNameRequired',
        'I need a name for the workflow. What would you like to call it?\n\nFor example: `@logicapps /createWorkflow OrderProcessing`'
      )
    );
    return {
      metadata: { command: ChatCommand.createWorkflow, needsParameter: 'workflowName' },
    };
  }

  // Find Logic App projects in the workspace
  const projects = await findLogicAppProjects();

  if (projects.length === 0) {
    stream.markdown(
      localize(
        'noLogicAppProjects',
        'No Logic App projects found in this workspace.\n\n' +
          'Please create a Logic App project first using `@logicapps /createProject` or the command palette.'
      )
    );
    return {
      metadata: { command: ChatCommand.createWorkflow, needsParameter: 'project' },
    };
  }

  // Try to match specified project name to a discovered project
  let targetProject: LogicAppProject | undefined;
  if (specifiedProject) {
    targetProject = projects.find((p) => p.name.toLowerCase() === specifiedProject!.toLowerCase());
  }

  // If no match and multiple projects, ask which one
  if (!targetProject && projects.length > 1) {
    const projectList = projects.map((p) => `- **${p.name}**`).join('\n');
    stream.markdown(
      localize('selectProject', `Multiple Logic App projects found. Which project should I add the workflow(s) to?\n\n${projectList}`)
    );
    return {
      metadata: {
        command: ChatCommand.createWorkflow,
        needsParameter: 'targetProject',
        pendingWorkflows: workflows,
      },
    };
  }

  // Single project or matched project
  if (!targetProject) {
    targetProject = projects[0];
  }
  const needsType = workflows.some((w) => w.type === undefined);
  if (needsType) {
    const workflowDesc = workflows.length === 1 ? workflowName || workflows[0]?.name : `${workflows[0]?.name}...`;
    stream.markdown(
      localize(
        'workflowTypeQuestion',
        `What type of workflow would you like to create for **${workflowDesc}**?\n\n- **Stateful**: Maintains state and run history (recommended for most scenarios)\n- **Stateless**: High-throughput, low-latency, no run history\n- **Agentic**: Autonomous AI agent workflow\n- **Agent**: Conversational AI agent workflow`
      )
    );
    return {
      metadata: {
        command: ChatCommand.createWorkflow,
        needsParameter: 'workflowType',
        pendingWorkflows: workflows,
        targetProject: targetProject.path,
      },
    };
  }

  // Single project with type specified - create workflows directly
  return await createWorkflowsInProject(targetProject, workflows, stream, token);
}

/**
 * Get the last chat result from context
 */
function getLastChatResult(context: vscode.ChatContext): LogicAppsChatResult | undefined {
  for (let i = context.history.length - 1; i >= 0; i--) {
    const item = context.history[i];
    if (item instanceof vscode.ChatResponseTurn && item.result) {
      return item.result as LogicAppsChatResult;
    }
  }
  return undefined;
}

/**
 * Handle user's response to project selection question
 */
async function handleProjectSelectionResponse(
  request: vscode.ChatRequest,
  lastResult: LogicAppsChatResult,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<LogicAppsChatResult> {
  const projects = await findLogicAppProjects();
  let targetProject: LogicAppProject | undefined;

  // Try LLM first to understand the response
  if (request.model) {
    const extracted = await extractConversationalResponse(request, lastResult, token);
    if (extracted?.targetProject) {
      targetProject = projects.find((p) => p.name.toLowerCase() === extracted.targetProject!.toLowerCase());
    }
  }

  // Fallback: explicit matching
  if (!targetProject) {
    const prompt = request.prompt.toLowerCase();
    for (const project of projects) {
      if (prompt.includes(project.name.toLowerCase())) {
        targetProject = project;
        break;
      }
    }
  }

  if (!targetProject) {
    const projectNames = projects.map((p) => p.name);
    stream.markdown(
      localize(
        'projectNotFound',
        `I couldn't find a project matching "${request.prompt}". Please specify one of these project names:\n\n${projectNames.map((n) => `- **${n}**`).join('\n')}`
      )
    );
    return {
      metadata: {
        command: ChatCommand.createWorkflow,
        needsParameter: 'targetProject',
        pendingWorkflows: lastResult.metadata.pendingWorkflows,
      },
    };
  }

  const workflows = lastResult.metadata.pendingWorkflows!;

  // Check if workflows need type specification
  const needsType = workflows.some((w) => w.type === undefined);
  if (needsType) {
    const baseName = workflows[0]?.name?.replace(/\d+$/, '') || 'workflows';
    const workflowDesc = workflows.length === 1 ? workflows[0].name : `${baseName}...`;
    stream.markdown(
      localize(
        'workflowTypeQuestion',
        `What type of workflow would you like to create for **${workflowDesc}**?\n\n- **Stateful**: Maintains state and run history (recommended for most scenarios)\n- **Stateless**: High-throughput, low-latency, no run history\n- **Agentic**: Autonomous AI agent workflow\n- **Agent**: Conversational AI agent workflow`
      )
    );
    return {
      metadata: {
        command: ChatCommand.createWorkflow,
        needsParameter: 'workflowType',
        pendingWorkflows: workflows,
        targetProject: targetProject.path,
      },
    };
  }

  return await createWorkflowsInProject(targetProject, workflows, stream, token);
}

/**
 * Handle user's response to workflow type question
 */
async function handleWorkflowTypeResponse(
  request: vscode.ChatRequest,
  lastResult: LogicAppsChatResult,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<LogicAppsChatResult> {
  let workflowType: WorkflowTypeOption | undefined;

  // Try LLM first to understand the response
  if (request.model) {
    const extracted = await extractConversationalResponse(request, lastResult, token);
    if (extracted?.workflowType) {
      workflowType = extracted.workflowType;
    }
  }

  // Fallback: explicit pattern matching
  if (!workflowType) {
    const prompt = request.prompt.toLowerCase();
    if (prompt.includes('stateless')) {
      workflowType = WorkflowTypeOption.stateless;
    } else if (prompt.includes('agentic') || prompt.includes('autonomous')) {
      workflowType = WorkflowTypeOption.agentic;
    } else if (prompt.includes('agent') || prompt.includes('conversational')) {
      workflowType = WorkflowTypeOption.agent;
    } else {
      workflowType = WorkflowTypeOption.stateful; // Default to stateful
    }
  }

  // Update workflows with the type
  const workflows: WorkflowSpec[] = lastResult.metadata.pendingWorkflows!.map((w) => ({
    name: w.name,
    type: workflowType!,
  }));

  // Check if we already have a target project
  if (lastResult.metadata.targetProject) {
    const targetProject: LogicAppProject = {
      name: path.basename(lastResult.metadata.targetProject),
      path: lastResult.metadata.targetProject,
    };
    return await createWorkflowsInProject(targetProject, workflows, stream, token);
  }

  // Find projects and check if we need to ask
  const projects = await findLogicAppProjects();

  if (projects.length === 0) {
    stream.markdown(
      localize(
        'noLogicAppProjects',
        'No Logic App projects found in this workspace.\n\n' + 'Please create a Logic App project first using `@logicapps /createProject`.'
      )
    );
    return {
      metadata: { command: ChatCommand.createWorkflow, needsParameter: 'project' },
    };
  }

  if (projects.length === 1) {
    return await createWorkflowsInProject(projects[0], workflows, stream, token);
  }

  // Multiple projects - ask which one
  const projectList = projects.map((p) => `- **${p.name}**`).join('\n');
  stream.markdown(
    localize('selectProject', `Multiple Logic App projects found. Which project should I add the workflow(s) to?\n\n${projectList}`)
  );
  return {
    metadata: {
      command: ChatCommand.createWorkflow,
      needsParameter: 'targetProject',
      pendingWorkflows: workflows,
    },
  };
}

/**
 * Create workflows in a specific project
 */
async function createWorkflowsInProject(
  project: LogicAppProject,
  workflows: WorkflowSpec[],
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<LogicAppsChatResult> {
  try {
    const workflowCount = workflows.length;
    const parallelMsg =
      workflowCount > 1 ? `I'll create all ${workflowCount} workflows concurrently since they're independent of each other.` : '';

    if (parallelMsg) {
      stream.markdown(`${parallelMsg}\n\n`);
    }

    stream.progress(localize('creatingWorkflows', `Preparing to create ${workflowCount} workflow(s) in "${project.name}"...`));

    // Determine project type by checking for custom code indicators
    const libPath = path.join(project.path, 'lib');
    const hasCustomCode = await fse.pathExists(libPath);
    const projectType = hasCustomCode ? ProjectType.customCode : ProjectType.logicApp;

    // Check for existing workflow conflicts before creating
    const conflicting: string[] = [];
    const toCreate: WorkflowSpec[] = [];
    for (const workflow of workflows) {
      const workflowDir = path.join(project.path, workflow.name);
      if (await fse.pathExists(workflowDir)) {
        conflicting.push(workflow.name);
      } else {
        toCreate.push(workflow);
      }
    }

    if (conflicting.length > 0 && toCreate.length === 0) {
      // All workflows already exist
      const conflictList = conflicting.map((n) => `- **${n}**`).join('\n');
      stream.markdown(
        localize(
          'allWorkflowsExist',
          `All specified workflows already exist in **"${project.name}"**:\n${conflictList}\n\nPlease choose different names.`
        )
      );
      return { metadata: { command: ChatCommand.createWorkflow, targetProject: project.path } };
    }

    if (conflicting.length > 0) {
      const conflictList = conflicting.map((n) => `**${n}**`).join(', ');
      stream.markdown(localize('someWorkflowsExist', `Skipping ${conflictList} (already exist). Creating the remaining workflows...\n\n`));
    }

    stream.progress(localize('creatingWorkflows', `Creating ${toCreate.length} workflow(s) in "${project.name}"...`));

    // Create non-conflicting workflows
    const createdWorkflows: string[] = [];
    const failedWorkflows: string[] = [];
    let wasCancelled = false;

    const maxConcurrency = Math.min(4, Math.max(1, toCreate.length));
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (true) {
        if (token.isCancellationRequested) {
          wasCancelled = true;
          return;
        }

        const index = nextIndex;
        nextIndex += 1;

        if (index >= toCreate.length) {
          return;
        }

        const workflow = toCreate[index];
        if (!workflow) {
          return;
        }

        try {
          stream.progress(localize('creatingSingleWorkflow', `Creating workflow "${workflow.name}"...`));
          await createAdditionalWorkflow(project.path, workflow.name, workflow.type!, projectType);
          createdWorkflows.push(`- **${workflow.name}** (${workflow.type})`);
          stream.progress(localize('createdSingleWorkflow', `Created workflow "${workflow.name}".`));
        } catch (error) {
          const rawErrorMessage = error instanceof Error ? error.message : String(error);
          const errorMessage = sanitizeWorkflowErrorMessage(rawErrorMessage);
          failedWorkflows.push(`- **${workflow.name}**: ${errorMessage}`);
          stream.progress(localize('failedSingleWorkflow', `Failed to create workflow "${workflow.name}".`));
        }
      }
    };

    await Promise.all(Array.from({ length: maxConcurrency }, () => worker()));

    createdWorkflows.sort((a, b) => a.localeCompare(b));
    failedWorkflows.sort((a, b) => a.localeCompare(b));

    // Build response message
    let message = '';
    if (createdWorkflows.length > 0) {
      message += localize(
        'workflowsCreated',
        `Successfully created ${createdWorkflows.length} workflow(s) in **"${project.name}"**!\n\n` +
          `**Workflows created:**\n${createdWorkflows.join('\n')}\n\n`
      );
    }

    if (failedWorkflows.length > 0) {
      message += localize('workflowsFailed', `\n**Failed to create:**\n${failedWorkflows.join('\n')}\n`);
    }

    if (wasCancelled) {
      message += localize('workflowCreateCancelled', '\nWorkflow creation was cancelled before all requested workflows were processed.\n');
    }

    if (createdWorkflows.length > 0) {
      message += 'You can now open any workflow in the designer or run and debug your Logic App locally.';
    }

    stream.markdown(message);

    return {
      metadata: {
        command: ChatCommand.createWorkflow,
        workflowName: workflows[0]?.name,
        workflows,
        targetProject: project.path,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stream.markdown(localize('workflowCreationError', `Failed to create workflows: ${errorMessage}`));
    return { metadata: { command: ChatCommand.createWorkflow } };
  }
}

function sanitizeWorkflowErrorMessage(error: string): string {
  if (!error) {
    return 'Unknown error';
  }

  const trimmed = error.trim();
  if (trimmed.length > 200) {
    return `${trimmed.slice(0, 197)}...`;
  }

  return trimmed;
}

/**
 * Handle /createProject command
 */
async function handleCreateProjectCommand(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  intent?: ParsedIntent
): Promise<LogicAppsChatResult> {
  stream.progress(localize('analyzingProjectRequest', 'Analyzing your project request...'));

  // Check if user is responding to a previous question
  const lastResult = getLastChatResult(context);
  let projectName = lastResult?.metadata?.projectName;
  let finalWorkflows: WorkflowSpec[] | undefined = lastResult?.metadata?.workflows;
  let includeCustomCode = lastResult?.metadata?.includeCustomCode ?? false;
  let projectType: ProjectTypeOption = lastResult?.metadata?.projectType ?? ProjectTypeOption.logicApp;
  let targetFramework: TargetFrameworkOption | undefined = lastResult?.metadata?.targetFramework;
  let functionName: string | undefined = lastResult?.metadata?.functionName;
  let functionNamespace: string | undefined = lastResult?.metadata?.functionNamespace;

  // If we're waiting for a parameter, use LLM to understand the conversational response
  if (lastResult?.metadata?.needsParameter && request.model) {
    const extracted = await extractConversationalResponse(request, lastResult, token);

    if (extracted) {
      if (extracted.projectName) {
        projectName = extracted.projectName;
      }
      if (extracted.workflows) {
        finalWorkflows = extracted.workflows;
      }
      if (extracted.confirmed && lastResult.metadata.needsParameter === 'projectName' && !projectName) {
        projectName = 'MyLogicApp'; // Default when user confirms without providing name
      }
    }
  }

  // Use pre-parsed intent data if available (from parseIntent LLM call)
  if (intent && !projectName) {
    projectName = intent.projectName;
  }
  if (intent?.workflows && (!finalWorkflows || finalWorkflows.length === 0)) {
    finalWorkflows = intent.workflows;
  }
  if (intent?.includeCustomCode) {
    includeCustomCode = true;
  }
  if (intent?.projectType) {
    projectType = intent.projectType;
    if (projectType === ProjectTypeOption.logicAppCustomCode || projectType === ProjectTypeOption.rulesEngine) {
      includeCustomCode = true;
    }
  }
  if (intent?.targetFramework) {
    targetFramework = intent.targetFramework;
  }
  if (intent?.functionName) {
    functionName = intent.functionName;
  }
  if (intent?.functionNamespace) {
    functionNamespace = intent.functionNamespace;
  }

  // Fallback: Parse the user's prompt explicitly if LLM didn't extract
  if (!projectName || !finalWorkflows) {
    const parsed = parseProjectRequest(request.prompt);
    if (parsed.name && !projectName) {
      projectName = parsed.name;
    }
    if (parsed.workflows && parsed.workflows.length > 0 && !finalWorkflows) {
      finalWorkflows = parsed.workflows;
    }
    if (parsed.includeCustomCode) {
      includeCustomCode = parsed.includeCustomCode;
    }
    if (parsed.type) {
      projectType = parsed.type;
    }
  }

  // Final fallback: Handle simple confirmation responses
  if (!projectName && lastResult?.metadata?.needsParameter === 'projectName') {
    if (isConfirmationResponse(request.prompt)) {
      projectName = 'MyLogicApp';
    }
  }

  if (!projectName) {
    stream.markdown(
      localize(
        'projectNameRequired',
        'I need a name for the project. What would you like to call it?\n\nFor example: `@logicapps /createProject MyLogicApp`'
      )
    );
    return {
      metadata: {
        command: ChatCommand.createProject,
        needsParameter: 'projectName',
        // Preserve workflows parsed from original prompt so we don't ask again
        workflows: finalWorkflows,
        includeCustomCode,
        projectType,
        targetFramework,
        functionName,
        functionNamespace,
      },
    };
  }

  // Handle "default" response for workflows
  if (lastResult?.metadata?.needsParameter === 'workflows' && request.prompt.toLowerCase().includes('default')) {
    finalWorkflows = [{ name: 'Workflow1', type: WorkflowTypeOption.stateful }];
  }

  // Handle workflow type confirmation response
  if (lastResult?.metadata?.needsParameter === 'workflowType' && finalWorkflows) {
    const lowerResponse = request.prompt.toLowerCase().trim();
    let selectedType: WorkflowTypeOption | undefined;

    if (lowerResponse.includes('stateful')) {
      selectedType = WorkflowTypeOption.stateful;
    } else if (lowerResponse.includes('stateless')) {
      selectedType = WorkflowTypeOption.stateless;
    } else if (lowerResponse.includes('agentic')) {
      selectedType = WorkflowTypeOption.agentic;
    } else if (lowerResponse.includes('agent')) {
      selectedType = WorkflowTypeOption.agent;
    }

    if (selectedType) {
      finalWorkflows = finalWorkflows.map((w) => ({
        ...w,
        type: w.type ?? selectedType,
      }));
    }
  }

  // If no workflows specified, ask the user what workflows they want
  if (!finalWorkflows || finalWorkflows.length === 0) {
    stream.markdown(
      localize(
        'workflowsQuestion',
        `What workflows would you like to create for **${projectName}**?\n\nYou can specify:\n- A single workflow: "a stateful workflow called OrderProcessing"\n- Multiple workflows: "5 stateful workflows from Workflow1 to Workflow5"\n- Named list: "stateful workflows: OrderProcessing, PaymentHandler, NotificationService"\n- Mixed types: "3 stateful workflows called Order and 2 agentic workflows called Agent"\n\nOr just say "default" to create a single stateful workflow.`
      )
    );
    return {
      metadata: { command: ChatCommand.createProject, projectName, needsParameter: 'workflows' },
    };
  }

  // Check if any workflows are missing a type — ask user to confirm
  const workflowsMissingType = finalWorkflows.some((w) => !w.type);
  if (workflowsMissingType) {
    const workflowNames = finalWorkflows.map((w) => `**${w.name}**`).join(', ');
    stream.markdown(
      localize(
        'workflowTypeQuestion',
        `What type should the workflow(s) ${workflowNames} be?\n\n- **Stateful** – Persists run history, supports retries and long-running operations\n- **Stateless** – Lightweight, high-throughput, no run history persistence\n- **Agentic** – AI-powered with agent capabilities\n`
      )
    );
    return {
      metadata: {
        command: ChatCommand.createProject,
        projectName,
        workflows: finalWorkflows,
        includeCustomCode,
        projectType,
        targetFramework,
        functionName,
        functionNamespace,
        needsParameter: 'workflowType',
      },
    };
  }

  // Directly create the project
  try {
    // For custom code projects: collect target framework if not specified
    if (projectType === ProjectTypeOption.logicAppCustomCode && !targetFramework) {
      // Handle response to targetFramework question
      if (lastResult?.metadata?.needsParameter === 'targetFramework') {
        const lowerResponse = request.prompt.toLowerCase().trim();
        if (lowerResponse.includes('472') || lowerResponse.includes('framework') || lowerResponse.includes('netfx')) {
          targetFramework = TargetFrameworkOption.netFx;
        } else {
          targetFramework = TargetFrameworkOption.net8; // Default to .NET 8
        }
      } else {
        stream.markdown(
          localize(
            'targetFrameworkQuestion',
            `Which .NET version would you like for the custom code project **${projectName}**?\n\n- **.NET 8** (recommended) – Latest cross-platform runtime\n- **.NET Framework (net472)** – Windows-only, legacy support\n\nOr just say "default" for .NET 8.`
          )
        );
        return {
          metadata: {
            command: ChatCommand.createProject,
            projectName,
            workflows: finalWorkflows,
            includeCustomCode,
            projectType,
            functionName,
            functionNamespace,
            needsParameter: 'targetFramework',
          },
        };
      }
    }

    // Default target framework
    if (!targetFramework) {
      targetFramework = TargetFrameworkOption.net8;
    }

    // For custom code / rules engine: default function name and namespace if not provided
    const isCustomCodeOrRules = projectType === ProjectTypeOption.logicAppCustomCode || projectType === ProjectTypeOption.rulesEngine;
    if (isCustomCodeOrRules) {
      if (!functionName) {
        functionName = `${projectName}Functions`;
      }
      if (!functionNamespace) {
        functionNamespace = `${projectName}.Functions`;
      }
    }

    stream.progress(localize('creatingProject', `Creating project "${projectName}" with ${finalWorkflows.length} workflow(s)...`));

    // Check if we're in a workspace - required for project creation
    if (!vscode.workspace.workspaceFile) {
      // Not in a workspace, need to create one first
      stream.markdown(
        localize(
          'needsWorkspace',
          `To create a Logic App project, you need to be in a Logic Apps workspace first.\n\nI'll open the workspace creation wizard for you. After creating the workspace, ask me again to create the "${projectName}" project.`
        )
      );
      await vscode.commands.executeCommand(extensionCommand.createWorkspace);
      return {
        metadata: { command: ChatCommand.createProject, projectName, workflows: finalWorkflows },
      };
    }

    // Get the workspace root folder
    const workspaceRootFolder = path.dirname(vscode.workspace.workspaceFile.fsPath);
    const logicAppFolderPath = path.join(workspaceRootFolder, projectName);

    // Check if project already exists — redirect to adding workflows if workflows were specified
    if (await fse.pathExists(logicAppFolderPath)) {
      if (finalWorkflows && finalWorkflows.length > 0) {
        // Project exists and workflows specified — add them to the existing project
        stream.markdown(
          localize('projectExistsAddingWorkflows', `Project **"${projectName}"** already exists. Adding workflow(s) to it...`)
        );
        const existingProject: LogicAppProject = { name: projectName, path: logicAppFolderPath };
        return await createWorkflowsInProject(existingProject, finalWorkflows, stream, token);
      }
      stream.markdown(
        localize('projectExists', `A project named "${projectName}" already exists in this workspace. Please choose a different name.`)
      );
      return {
        metadata: { command: ChatCommand.createProject, projectName },
      };
    }

    // Determine project type
    const finalProjectType =
      projectType === ProjectTypeOption.rulesEngine
        ? ProjectType.rulesEngine
        : includeCustomCode || projectType === ProjectTypeOption.logicAppCustomCode
          ? ProjectType.customCode
          : ProjectType.logicApp;

    // Use the first workflow for the initial project creation
    const firstWorkflow = finalWorkflows[0];

    // Build the function folder name for custom code / rules engine
    const functionFolderName = isCustomCodeOrRules ? functionName : undefined;

    // Create the project context with the first workflow
    const projectContext: any = {
      logicAppName: projectName,
      logicAppType: finalProjectType,
      workflowName: firstWorkflow.name,
      workflowType: mapWorkflowTypeToProjectType(firstWorkflow.type),
      workspaceFilePath: vscode.workspace.workspaceFile.fsPath,
      shouldCreateLogicAppProject: true,
      targetFramework: targetFramework,
      // Custom code / rules engine params
      functionFolderName: functionFolderName,
      functionName: functionName,
      functionNamespace: functionNamespace,
    };

    // Create a minimal action context
    const actionContext: any = {
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { issueProperties: {} },
      valuesToMask: [],
    };

    // Create the project with the first workflow
    await createLogicAppProject(actionContext, projectContext, workspaceRootFolder);

    // Create additional workflows if specified
    if (finalWorkflows.length > 1) {
      stream.progress(localize('creatingAdditionalWorkflows', 'Creating additional workflows...'));

      for (let i = 1; i < finalWorkflows.length; i++) {
        const workflow = finalWorkflows[i];
        await createAdditionalWorkflow(logicAppFolderPath, workflow.name, workflow.type, finalProjectType);
      }
    }

    // Build workflow list for the success message
    const workflowListItems = finalWorkflows.map((w) => `- **${w.name}** (${w.type})`).join('\n');

    // Build project-type-specific details for the success message
    let projectIncludes =
      '**Project includes:**\n' + '- Configuration files (host.json, local.settings.json)\n' + '- VS Code settings for debugging\n';

    if (finalProjectType === ProjectType.customCode) {
      projectIncludes +=
        `- Custom code function project (**${functionName}**) with .NET ${targetFramework === TargetFrameworkOption.netFx ? 'Framework (net472)' : '8'}\n` +
        `- Namespace: **${functionNamespace}**\n`;
    } else if (finalProjectType === ProjectType.rulesEngine) {
      projectIncludes += `- Rules engine function project (**${functionName}**)\n- Sample rule set and schema files\n- Namespace: **${functionNamespace}**\n`;
    }

    stream.markdown(
      localize(
        'projectCreatedWithWorkflows',
        `Successfully created Logic App project **"${projectName}"** with ${finalWorkflows.length} workflow(s)!\n\n**Workflows created:**\n${workflowListItems}\n\n${projectIncludes}\nYou can now:\n- Open any workflow in the designer\n- Create additional workflows with \`@logicapps /createWorkflow\`\n- Run and debug your Logic App locally`
      )
    );

    return {
      metadata: { command: ChatCommand.createProject, projectName, workflows: finalWorkflows },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stream.markdown(localize('projectCreationError', `Failed to create project: ${errorMessage}`));
    return { metadata: { command: ChatCommand.createProject } };
  }
}

/**
 * Create an additional workflow in an existing Logic App project
 */
async function createAdditionalWorkflow(
  logicAppFolderPath: string,
  workflowName: string,
  workflowType: WorkflowTypeOption,
  projectType: ProjectType
): Promise<void> {
  const workflowFolderPath = path.join(logicAppFolderPath, workflowName);
  await fse.ensureDir(workflowFolderPath);

  const codelessDefinition = getCodelessWorkflowTemplate(projectType, mapWorkflowTypeToProjectType(workflowType), undefined);

  const workflowJsonPath = path.join(workflowFolderPath, workflowFileName);
  await writeFormattedJson(workflowJsonPath, codelessDefinition);
}

/**
 * Map WorkflowTypeOption to the project WorkflowType constant
 */
function mapWorkflowTypeToProjectType(workflowType: WorkflowTypeOption): WorkflowType {
  switch (workflowType) {
    case WorkflowTypeOption.stateless:
      return WorkflowType.stateless;
    case WorkflowTypeOption.agentic:
      return WorkflowType.agentic;
    case WorkflowTypeOption.agent:
      return WorkflowType.agent;
    case WorkflowTypeOption.stateful:
    default:
      return WorkflowType.stateful;
  }
}

/**
 * Handle /modifyAction command
 */
async function handleModifyActionCommand(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  intent?: ParsedIntent
): Promise<LogicAppsChatResult> {
  stream.progress(localize('analyzingModification', 'Analyzing your modification request...'));

  const lastResult = getLastChatResult(context);
  const pendingModificationPrompt =
    lastResult?.metadata?.pendingModificationPrompt && lastResult.metadata.command === ChatCommand.modifyAction
      ? lastResult.metadata.pendingModificationPrompt
      : request.prompt;

  let effectivePrompt = pendingModificationPrompt;
  let forcedProjectName: string | undefined;

  if (lastResult?.metadata?.needsParameter === 'targetProject' && lastResult.metadata.command === ChatCommand.modifyAction) {
    const pendingProjectNames = lastResult.metadata.pendingProjectNames ?? [];
    const selectedProjectName = resolveSelectedProjectName(request.prompt, pendingProjectNames);

    if (pendingProjectNames.length > 0 && !selectedProjectName) {
      const projectOptions = pendingProjectNames.map((name) => `- ${name}`).join('\n');
      stream.markdown(
        localize(
          'projectSelectionRequiredForModify',
          `I couldn't match "${request.prompt}" to a project. Please choose one of these projects:\n${projectOptions}`
        )
      );
      return {
        metadata: {
          command: ChatCommand.modifyAction,
          needsParameter: 'targetProject',
          pendingModificationPrompt,
          pendingProjectNames,
        },
      };
    }

    const projectNameFromReply = selectedProjectName ?? request.prompt.replace(/^\s*@logicapps\s*/i, '').trim();
    forcedProjectName = projectNameFromReply;
    effectivePrompt = `${pendingModificationPrompt}\nProject name: ${projectNameFromReply}`;
  }

  if (!forcedProjectName) {
    forcedProjectName = intent?.targetProject?.trim() || extractTargetProjectFromPrompt(pendingModificationPrompt);
  }

  if (forcedProjectName && !/project name\s*:/i.test(effectivePrompt)) {
    effectivePrompt = `${effectivePrompt}\nProject name: ${forcedProjectName}`;
  }

  if (!request.model) {
    stream.markdown(localize('modelUnavailableForModify', 'A language model is required to modify workflow actions from chat.'));
    return { metadata: { command: ChatCommand.modifyAction } };
  }

  try {
    const tools = vscode.lm.tools.filter(
      (tool) => tool.name.startsWith('logicapps_') && tool.name !== ToolName.createProject && tool.name !== ToolName.createWorkflow
    );

    const messages: vscode.LanguageModelChatMessage[] = [
      vscode.LanguageModelChatMessage.User(
        `Modify the workflow action as requested: ${effectivePrompt}

Follow these rules:
- If adding "When a HTTP request is received", create it as a trigger in definition.triggers using type "Request", not an action in definition.actions.
- For managed connectors (for example SQL, Service Bus, Office 365, Weather), prefer ApiConnection actions over raw Http calls and include connectorReference plus operation method/path when available from connector metadata.
- Do not fabricate local file paths or clickable markdown links. Mention plain filenames unless a tool returns an exact path.`
      ),
    ];

    const orchestrationResult = await runToolOrchestration(request, stream, token, tools, messages, {
      forcedProjectName,
      requireMutation: true,
      mutationNudge:
        'You have inspected the workflow. Now apply the requested modification by calling logicapps_modifyAction or logicapps_addAction with concrete parameters.',
    });

    let projectNames = extractProjectNamesFromAmbiguityResponse(orchestrationResult.toolResponseText);
    const needsProjectDisambiguation =
      orchestrationResult.requestedProjectDisambiguation || /please specify projectname/i.test(orchestrationResult.toolResponseText);

    if (needsProjectDisambiguation && projectNames.length === 0) {
      const projects = await findLogicAppProjects();
      projectNames = projects.map((project) => project.name);
    }

    if (needsProjectDisambiguation) {
      return {
        metadata: {
          command: ChatCommand.modifyAction,
          needsParameter: 'targetProject',
          pendingModificationPrompt,
          pendingProjectNames: projectNames,
        },
      };
    }

    return {
      metadata: { command: ChatCommand.modifyAction },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stream.markdown(localize('modificationError', `Failed to modify action: ${errorMessage}`));
    return { metadata: { command: ChatCommand.modifyAction } };
  }
}

/**
 * Handle /help command
 */
async function handleHelpCommand(stream: vscode.ChatResponseStream): Promise<LogicAppsChatResult> {
  stream.markdown(`# Azure Logic Apps Assistant

I can help you create and manage Logic Apps workflows and projects. Here's what I can do:

## Commands

- **\`/createProject\`** - Create a new Logic App project
  - Example: \`/createProject MyLogicApp\`
  - Example: \`/createProject OrderProcessor with custom code support\`

- **\`/createWorkflow\`** - Create a new workflow in your project
  - Example: \`/createWorkflow OrderProcessing\`
  - Example: \`/createWorkflow a stateless workflow called HighThroughputAPI\`

- **\`/modifyAction\`** - Modify an action in an existing workflow
  - Example: \`/modifyAction change the timeout on SendEmail action to 5 minutes\`

- **\`/help\`** - Show this help message

## Workflow Types

- **Stateful** - Maintains state and run history (recommended for most scenarios)
- **Stateless** - High-throughput, low-latency, no run history
- **Agentic** - Autonomous AI agent workflows
- **Agent** - Conversational AI agent workflows

## Tips

- I can understand natural language, so feel free to describe what you want to create
- If I need more information, I'll ask you follow-up questions
- You can always open workflows in the designer for visual editing
`);

  return { metadata: { command: ChatCommand.help } };
}

/**
 * Handle general chat requests
 */
async function handleGeneralRequest(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<LogicAppsChatResult> {
  // Check if a language model is available
  if (!request.model) {
    stream.markdown(
      localize(
        'modelUnavailable',
        'I can help you with Logic Apps! Here are some things you can do:\n\n' +
          '- **Create a project**: `@logicapps /createProject MyProjectName`\n' +
          '- **Create a workflow**: `@logicapps /createWorkflow MyWorkflowName`\n' +
          '- **Get help**: `@logicapps /help`\n\n' +
          'For more advanced assistance, please ensure GitHub Copilot is enabled.'
      )
    );
    return { metadata: {} };
  }

  try {
    const tools = vscode.lm.tools.filter(
      (tool) =>
        tool.name.startsWith('logicapps_') &&
        // Exclude project/workflow creation tools — these are handled by explicit routing
        tool.name !== ToolName.createProject &&
        tool.name !== ToolName.createWorkflow
    );
    const messages: vscode.LanguageModelChatMessage[] = [vscode.LanguageModelChatMessage.User(`${SYSTEM_PROMPT}\n${RESPONSE_GUARDRAILS}`)];

    // Add relevant history
    for (const historyItem of context.history) {
      if (historyItem instanceof vscode.ChatRequestTurn) {
        messages.push(vscode.LanguageModelChatMessage.User(historyItem.prompt));
      } else if (historyItem instanceof vscode.ChatResponseTurn) {
        const responseText = historyItem.response
          .map((part) => {
            if (part instanceof vscode.ChatResponseMarkdownPart) {
              return part.value.value;
            }
            return '';
          })
          .join('');
        messages.push(vscode.LanguageModelChatMessage.Assistant(responseText));
      }
    }

    // Add current request
    messages.push(vscode.LanguageModelChatMessage.User(request.prompt));

    await runToolOrchestration(request, stream, token, tools, messages);

    return { metadata: {} };
  } catch (error) {
    if (error instanceof vscode.LanguageModelError) {
      if (error.code === vscode.LanguageModelError.NotFound.name) {
        stream.markdown(
          localize('modelNotFound', 'The language model is not available. Please ensure you have GitHub Copilot installed and activated.')
        );
      } else if (error.code === vscode.LanguageModelError.Blocked.name) {
        stream.markdown(localize('requestBlocked', 'The request was blocked. Please try rephrasing your question.'));
      } else {
        stream.markdown(localize('languageModelError', `Language model error: ${error.message}`));
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stream.markdown(localize('generalError', `An error occurred: ${errorMessage}`));
    }

    return { metadata: {} };
  }
}

/**
 * Parse workflow creation request to extract name and type
 * @internal Exported for testing
 */
export function parseWorkflowRequest(prompt: string): { name?: string; type?: WorkflowTypeOption } {
  let name: string | undefined;
  let type: WorkflowTypeOption | undefined;

  // Extract workflow type from prompt
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('stateless')) {
    type = WorkflowTypeOption.stateless;
  } else if (lowerPrompt.includes('agentic') || lowerPrompt.includes('autonomous')) {
    type = WorkflowTypeOption.agentic;
  } else if (lowerPrompt.includes('agent') || lowerPrompt.includes('conversational')) {
    type = WorkflowTypeOption.agent;
  } else if (lowerPrompt.includes('stateful')) {
    type = WorkflowTypeOption.stateful;
  }

  // Extract workflow name - look for quoted names or capitalized words
  const quotedMatch = prompt.match(/["']([^"']+)["']/);
  if (quotedMatch) {
    name = quotedMatch[1];
  } else {
    // Look for "called X" or "named X" with a capitalized name (at least 3 chars)
    const namedMatch = prompt.match(/(?:called|named)\s+([A-Z][a-zA-Z0-9_-]{2,})/);
    if (namedMatch) {
      name = namedMatch[1];
    } else {
      // Try to find any PascalCase word that could be a name (at least 3 chars)
      const words = prompt.split(/\s+/);
      for (const word of words) {
        if (/^[A-Z][a-zA-Z0-9_-]+$/.test(word) && word.length > 2) {
          // Skip common words
          if (!['Stateful', 'Stateless', 'Agentic', 'Agent', 'Workflow', 'Logic', 'App', 'Create'].includes(word)) {
            name = word;
            break;
          }
        }
      }
    }
  }

  return { name, type };
}

/**
 * Parse project creation request to extract name, type, and workflow specifications
 * @internal Exported for testing
 */
export function parseProjectRequest(prompt: string): {
  name?: string;
  type?: ProjectTypeOption;
  includeCustomCode?: boolean;
  workflows?: WorkflowSpec[];
} {
  let name: string | undefined;
  let type: ProjectTypeOption = ProjectTypeOption.logicApp;
  let includeCustomCode = false;

  const lowerPrompt = prompt.toLowerCase();

  // Check for rules engine project
  if (lowerPrompt.includes('rules engine') || lowerPrompt.includes('rule engine') || lowerPrompt.includes('business rules')) {
    type = ProjectTypeOption.rulesEngine;
    includeCustomCode = true;
  }
  // Check for custom code support
  else if (
    lowerPrompt.includes('custom code') ||
    lowerPrompt.includes('functions') ||
    lowerPrompt.includes('c#') ||
    lowerPrompt.includes('dotnet')
  ) {
    type = ProjectTypeOption.logicAppCustomCode;
    includeCustomCode = true;
  }

  // Extract project name - look for quoted names or capitalized words
  const quotedMatch = prompt.match(/["']([^"']+)["']/);
  if (quotedMatch) {
    name = quotedMatch[1];
  } else {
    // Look for "name it X", "call it X" patterns first (handles "Name it MyLogicApp")
    const nameItMatch = prompt.match(/(?:name|call)\s+it\s+([A-Z][a-zA-Z0-9_-]{2,})/i);
    if (nameItMatch) {
      name = nameItMatch[1];
    } else {
      // Look for "called X" or "named X" with a capitalized name (at least 3 chars)
      const namedMatch = prompt.match(/(?:called|named)\s+([A-Z][a-zA-Z0-9_-]{2,})/);
      if (namedMatch) {
        name = namedMatch[1];
      } else {
        // Try to find any PascalCase word that could be a name (at least 3 chars)
        const words = prompt.split(/\s+/);
        for (const word of words) {
          if (/^[A-Z][a-zA-Z0-9_-]+$/.test(word) && word.length > 2) {
            // Skip common words
            if (!['Logic', 'App', 'Project', 'Custom', 'Code', 'Functions', 'Create', 'Name', 'Call', 'New'].includes(word)) {
              name = word;
              break;
            }
          }
        }
      }
    }
  }

  // Parse workflow specifications
  const workflows = parseWorkflowSpecs(prompt);

  return { name, type, includeCustomCode, workflows };
}

/**
 * Parse workflow specifications from a prompt
 * Supports patterns like:
 * - "a stateful workflow called OrderProcessing"
 * - "5 stateful workflows from Stateful1 to Stateful5"
 * - "3 stateful workflows called Order and 2 agentic workflows called Agent"
 * @internal Exported for testing
 */
export function parseWorkflowSpecs(prompt: string): WorkflowSpec[] {
  const workflows: WorkflowSpec[] = [];

  // Pattern 1a: "N <type> workflows from X1 to XN" (e.g., "5 stateful workflows from Stateful1 to Stateful5")
  // Allows extra words between "workflows" and "from" (e.g., "under ProjectName")
  const rangePattern =
    /(\d+)\s+(stateful|stateless|agentic|agent)\s+workflows?\s+(?:[\w\s]*?)from\s+([A-Za-z][A-Za-z0-9_-]*?)(\d+)\s+to\s+\3(\d+)/gi;
  let rangeMatch: RegExpExecArray | null;
  while ((rangeMatch = rangePattern.exec(prompt)) !== null) {
    const count = Number.parseInt(rangeMatch[1], 10);
    const workflowType = mapWorkflowType(rangeMatch[2]);
    const baseName = rangeMatch[3];
    const startNum = Number.parseInt(rangeMatch[4], 10);
    const endNum = Number.parseInt(rangeMatch[5], 10);

    for (let i = startNum; i <= endNum && i - startNum < count; i++) {
      const workflowName = `${baseName}${i}`;
      if (!workflows.some((w) => w.name === workflowName)) {
        workflows.push({ name: workflowName, type: workflowType });
      }
    }
  }

  // If range pattern matched, return early to avoid double-matching
  if (workflows.length > 0) {
    return workflows;
  }

  // Pattern 1b: "N <type> workflows from X1-N" shorthand (e.g., "5 stateful workflows from Stateful1-5")
  // Allows extra words between "workflows" and "from"
  const rangeShortPattern2 =
    /(\d+)\s+(stateful|stateless|agentic|agent)\s+workflows?\s+(?:[\w\s]*?)from\s+([A-Za-z][A-Za-z0-9_-]*?)(\d+)-(\d+)/gi;
  let rangeShortMatch2: RegExpExecArray | null;
  while ((rangeShortMatch2 = rangeShortPattern2.exec(prompt)) !== null) {
    const workflowType = mapWorkflowType(rangeShortMatch2[2]);
    const baseName = rangeShortMatch2[3];
    const startNum = Number.parseInt(rangeShortMatch2[4], 10);
    const endNum = Number.parseInt(rangeShortMatch2[5], 10);

    for (let i = startNum; i <= endNum; i++) {
      const workflowName = `${baseName}${i}`;
      if (!workflows.some((w) => w.name === workflowName)) {
        workflows.push({ name: workflowName, type: workflowType });
      }
    }
  }

  if (workflows.length > 0) {
    return workflows;
  }

  // Pattern 1c: "N workflows from X1-N" without type (e.g., "5 workflows from Stateful1-5")
  // Allows extra words between "workflows" and "from"
  const rangeNoTypePattern = /(\d+)\s+workflows?\s+(?:[\w\s]*?)from\s+([A-Za-z][A-Za-z0-9_-]*?)(\d+)-(\d+)/gi;
  let rangeNoTypeMatch: RegExpExecArray | null;
  while ((rangeNoTypeMatch = rangeNoTypePattern.exec(prompt)) !== null) {
    const baseName = rangeNoTypeMatch[2];
    const startNum = Number.parseInt(rangeNoTypeMatch[3], 10);
    const endNum = Number.parseInt(rangeNoTypeMatch[4], 10);

    for (let i = startNum; i <= endNum; i++) {
      const workflowName = `${baseName}${i}`;
      if (!workflows.some((w) => w.name === workflowName)) {
        workflows.push({ name: workflowName });
      }
    }
  }

  if (workflows.length > 0) {
    return workflows;
  }

  // Pattern 2: "N <type> workflows called X" (e.g., "3 stateful workflows called Order")
  // This pattern handles multiple instances like "3 stateful called Order and 2 agentic called Agent"
  const countNamePattern = /(\d+)\s+(stateful|stateless|agentic|agent)\s+workflows?\s+(?:called|named)\s+([A-Za-z][A-Za-z0-9_-]*)/gi;
  let countMatch: RegExpExecArray | null;
  while ((countMatch = countNamePattern.exec(prompt)) !== null) {
    const count = Number.parseInt(countMatch[1], 10);
    const workflowType = mapWorkflowType(countMatch[2]);
    const baseName = countMatch[3];

    for (let i = 1; i <= count; i++) {
      const workflowName = count > 1 ? `${baseName}${i}` : baseName;
      if (!workflows.some((w) => w.name === workflowName)) {
        workflows.push({ name: workflowName, type: workflowType });
      }
    }
  }

  // If count pattern matched, return (don't early return, allow multiple matches above)
  if (workflows.length > 0) {
    return workflows;
  }

  // Pattern 2b: "N workflows called X" (no type specified → type left undefined for confirmation)
  const countNoTypePattern = /(\d+)\s+workflows?\s+(?:called|named)\s+([A-Za-z][A-Za-z0-9_-]*)/gi;
  let countNoTypeMatch: RegExpExecArray | null;
  while ((countNoTypeMatch = countNoTypePattern.exec(prompt)) !== null) {
    const count = Number.parseInt(countNoTypeMatch[1], 10);
    const baseName = countNoTypeMatch[2];

    for (let i = 1; i <= count; i++) {
      const workflowName = count > 1 ? `${baseName}${i}` : baseName;
      if (!workflows.some((w) => w.name === workflowName)) {
        workflows.push({ name: workflowName });
      }
    }
  }

  if (workflows.length > 0) {
    return workflows;
  }

  // Pattern 3: "a <type> workflow called X" (single workflow with explicit type)
  const singlePattern = /(?:a|an|one)\s+(stateful|stateless|agentic|agent)\s+workflow\s+(?:called|named)\s+([A-Za-z][A-Za-z0-9_-]+)/gi;
  let singleMatch: RegExpExecArray | null;
  while ((singleMatch = singlePattern.exec(prompt)) !== null) {
    const workflowType = mapWorkflowType(singleMatch[1]);
    const workflowName = singleMatch[2];

    if (!workflows.some((w) => w.name === workflowName)) {
      workflows.push({ name: workflowName, type: workflowType });
    }
  }

  // If single pattern matched, return
  if (workflows.length > 0) {
    return workflows;
  }

  // Pattern 3b: "a workflow called X" (single workflow, no type specified → type left undefined for confirmation)
  const singleNoTypePattern = /(?:a|an|one)\s+workflow\s+(?:called|named)\s+([A-Za-z][A-Za-z0-9_-]+)/gi;
  let singleNoTypeMatch: RegExpExecArray | null;
  while ((singleNoTypeMatch = singleNoTypePattern.exec(prompt)) !== null) {
    const workflowName = singleNoTypeMatch[1];

    if (!workflows.some((w) => w.name === workflowName)) {
      workflows.push({ name: workflowName });
    }
  }

  // If no-type pattern matched, return
  if (workflows.length > 0) {
    return workflows;
  }

  // Pattern 4: Simple workflow specification like "with a stateful workflow"
  const simplePattern = /(?:with\s+)?(?:a|an|one)\s+(stateful|stateless|agentic|agent)\s+workflow(?!\s+(?:called|named))/gi;
  const simpleMatch = simplePattern.exec(prompt);
  if (simpleMatch) {
    const workflowType = mapWorkflowType(simpleMatch[1]);
    workflows.push({ name: 'Workflow1', type: workflowType });
  }

  return workflows;
}

/**
 * Map workflow type string to WorkflowTypeOption
 */
function mapWorkflowType(typeStr: string): WorkflowTypeOption {
  const lower = typeStr.toLowerCase();
  if (lower === 'stateless') {
    return WorkflowTypeOption.stateless;
  }
  if (lower === 'agentic') {
    return WorkflowTypeOption.agentic;
  }
  if (lower === 'agent') {
    return WorkflowTypeOption.agent;
  }
  return WorkflowTypeOption.stateful;
}

/**
 * Map LLM-extracted type string to WorkflowTypeOption
 * Returns undefined if type wasn't specified so we know to ask
 * @internal Exported for testing
 */
export function mapExtractedType(typeStr: string | undefined): WorkflowTypeOption | undefined {
  if (!typeStr) {
    return undefined;
  }
  const lower = typeStr.toLowerCase();
  if (lower === 'stateless') {
    return WorkflowTypeOption.stateless;
  }
  if (lower === 'agentic') {
    return WorkflowTypeOption.agentic;
  }
  if (lower === 'agent') {
    return WorkflowTypeOption.agent;
  }
  if (lower === 'stateful') {
    return WorkflowTypeOption.stateful;
  }
  return undefined; // Unknown type - will need to ask
}

/**
 * Map LLM-extracted project type string to ProjectTypeOption
 * @internal Exported for testing
 */
export function mapParsedProjectType(typeStr: string | undefined): ProjectTypeOption | undefined {
  if (!typeStr) {
    return undefined;
  }
  const lower = typeStr.toLowerCase();
  if (lower === 'rulesengine' || lower === 'rules engine' || lower === 'rules') {
    return ProjectTypeOption.rulesEngine;
  }
  if (lower === 'logicappcustomcode' || lower === 'customcode' || lower === 'custom code') {
    return ProjectTypeOption.logicAppCustomCode;
  }
  if (lower === 'logicapp' || lower === 'logic app') {
    return ProjectTypeOption.logicApp;
  }
  return undefined;
}

/**
 * Map LLM-extracted target framework string to TargetFrameworkOption
 * @internal Exported for testing
 */
export function mapParsedTargetFramework(framework: string | undefined): TargetFrameworkOption | undefined {
  if (!framework) {
    return undefined;
  }
  const lower = framework.toLowerCase();
  if (lower === 'net472' || lower === 'netfx' || lower === 'net framework' || lower === '.net framework') {
    return TargetFrameworkOption.netFx;
  }
  if (lower === 'net8' || lower === 'net 8' || lower === '.net 8') {
    return TargetFrameworkOption.net8;
  }
  return undefined;
}

/**
 * Find all Logic App projects in the workspace
 * A Logic App project is identified by having a host.json file with the Workflows extension bundle
 * Excludes workflow-designtime folders (build artifacts) and deduplicates results
 */
async function findLogicAppProjects(): Promise<LogicAppProject[]> {
  const projects: LogicAppProject[] = [];
  const seenPaths = new Set<string>();

  if (!vscode.workspace.workspaceFolders) {
    return projects;
  }

  // Search for host.json files, excluding node_modules and workflow-designtime folders
  const hostJsonFiles = await vscode.workspace.findFiles('**/host.json', '{**/node_modules/**,**/workflow-designtime/**,**/.debug/**}');

  for (const hostJsonUri of hostJsonFiles) {
    const hostJsonPath = hostJsonUri.fsPath;
    const projectPath = path.dirname(hostJsonPath);
    const projectName = path.basename(projectPath);

    // Skip if we've already seen this path (deduplication)
    if (seenPaths.has(projectPath)) {
      continue;
    }

    // Skip workflow-designtime folders (double check in case glob didn't catch it)
    if (projectPath.includes('workflow-designtime') || projectPath.includes('.debug')) {
      continue;
    }

    // Verify it's a Logic App by checking for extensionBundle in host.json
    try {
      const hostJsonContent = await fse.readJson(hostJsonPath);
      if (hostJsonContent.extensionBundle?.id?.includes('Microsoft.Azure.Functions.ExtensionBundle.Workflows')) {
        seenPaths.add(projectPath);
        projects.push({ name: projectName, path: projectPath });
      }
    } catch {
      // Skip files that can't be parsed
    }
  }

  return projects;
}

/**
 * Parse workflow specifications for adding workflows to existing projects
 * Supports patterns like:
 * - "5 additional workflows Order4-8" -> Order4, Order5, Order6, Order7, Order8
 * - "create workflows Order4-8" -> Order4, Order5, Order6, Order7, Order8
 * - "5 stateful workflows Order4-8" -> Order4, Order5, Order6, Order7, Order8 (all stateful)
 * @internal Exported for testing
 */
export function parseAdditionalWorkflowSpecs(prompt: string): { workflows: WorkflowSpec[]; baseName?: string } {
  const workflows: WorkflowSpec[] = [];

  // Check for workflow type in prompt
  const lowerPrompt = prompt.toLowerCase();
  let defaultType: WorkflowTypeOption | undefined;
  if (lowerPrompt.includes('stateless')) {
    defaultType = WorkflowTypeOption.stateless;
  } else if (lowerPrompt.includes('agentic')) {
    defaultType = WorkflowTypeOption.agentic;
  } else if (lowerPrompt.includes('agent') && !lowerPrompt.includes('agentic')) {
    defaultType = WorkflowTypeOption.agent;
  } else if (lowerPrompt.includes('stateful')) {
    defaultType = WorkflowTypeOption.stateful;
  }

  // Pattern 1: "X workflows Name1-N" or "X additional workflows Name1-N" (e.g., "5 workflows Order4-8")
  const rangeShortPattern =
    /(\d+)\s+(?:additional\s+)?(?:stateful|stateless|agentic|agent)?\s*workflows?\s+([A-Za-z][A-Za-z0-9_-]*)(\d+)-(\d+)/i;
  const rangeShortMatch = rangeShortPattern.exec(prompt);
  if (rangeShortMatch) {
    const baseName = rangeShortMatch[2];
    const startNum = Number.parseInt(rangeShortMatch[3], 10);
    const endNum = Number.parseInt(rangeShortMatch[4], 10);

    for (let i = startNum; i <= endNum; i++) {
      workflows.push({ name: `${baseName}${i}`, type: defaultType });
    }
    return { workflows, baseName };
  }

  // Pattern 2: Just "Name1-N" (e.g., "Order4-8" as a follow-up)
  const simpleRangePattern = /^([A-Za-z][A-Za-z0-9_-]*)(\d+)-(\d+)$/;
  const simpleRangeMatch = simpleRangePattern.exec(prompt.trim());
  if (simpleRangeMatch) {
    const baseName = simpleRangeMatch[1];
    const startNum = Number.parseInt(simpleRangeMatch[2], 10);
    const endNum = Number.parseInt(simpleRangeMatch[3], 10);

    for (let i = startNum; i <= endNum; i++) {
      workflows.push({ name: `${baseName}${i}`, type: defaultType });
    }
    return { workflows, baseName };
  }

  return { workflows };
}
