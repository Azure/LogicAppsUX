import type { WorkflowEditResponse, WorkflowChange } from '../../copilotWorkflowEditor';
import { WorkflowChangeType, WorkflowChangeTargetType } from '../../copilotWorkflowEditor';
import type { Workflow } from '../../../../utils/src';

/**
 * Strip JavaScript-style comments from a string so that JSON.parse can succeed
 * even when the LLM injects comments into its JSON output.
 */
export function stripJsonComments(str: string): string {
  let result = '';
  let inString = false;
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (inString) {
      result += ch;
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
      i += 2;
      while (i < str.length && str[i] !== '\n') {
        i++;
      }
      continue;
    } else if (ch === '/' && i + 1 < str.length && str[i + 1] === '*') {
      i += 2;
      while (i < str.length && !(str[i] === '*' && i + 1 < str.length && str[i + 1] === '/')) {
        i++;
      }
      i += 2;
      continue;
    } else {
      result += ch;
    }
    i++;
  }
  return result;
}

/**
 * Attempt to fix unescaped double quotes inside JSON string values.
 */
export function repairJson(str: string): string {
  let result = '';
  let inString = false;
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (inString) {
      if (ch === '\\' && i + 1 < str.length) {
        result += ch + str[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') {
        let j = i + 1;
        while (j < str.length && (str[j] === ' ' || str[j] === '\t' || str[j] === '\n' || str[j] === '\r')) {
          j++;
        }
        const next = j < str.length ? str[j] : '';
        if (next === ':' || next === ',' || next === '}' || next === ']' || j >= str.length) {
          inString = false;
          result += ch;
        } else {
          result += '\\"';
        }
      } else {
        result += ch;
      }
    } else if (ch === '"') {
      inString = true;
      result += ch;
    } else {
      result += ch;
    }
    i++;
  }
  return result;
}

function tryJsonParse(str: string): unknown | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function getParseError(str: string): string {
  try {
    JSON.parse(str);
    return 'no error';
  } catch (e: unknown) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * Try to extract a JSON object by finding the outermost `{…}` in the content.
 */
function tryExtractJson(content: string): unknown | null {
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  const extracted = stripJsonComments(content.substring(firstBrace, lastBrace + 1));
  return tryJsonParse(extracted) ?? tryJsonParse(repairJson(extracted));
}

function parseChanges(rawChanges: unknown): WorkflowChange[] | undefined {
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

function buildResponseFromParsed(parsed: any, rawContent: string, currentWorkflow: Workflow): WorkflowEditResponse {
  if (parsed.type === 'workflow' && parsed.workflow) {
    const proposedWorkflow: Workflow = {
      definition: parsed.workflow.definition ?? parsed.workflow,
      connectionReferences: parsed.workflow.connectionReferences ?? currentWorkflow.connectionReferences ?? {},
      parameters: parsed.workflow.parameters ?? currentWorkflow.parameters,
      notes: parsed.workflow.notes ?? currentWorkflow.notes,
      kind: parsed.workflow.kind ?? currentWorkflow.kind,
    };

    const changes = parseChanges(parsed.changes);

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
      text: parsed.text ?? rawContent,
    };
  }

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

  return { type: 'text', text: parsed.text ?? rawContent };
}

/**
 * Parses a raw LLM response string into a structured WorkflowEditResponse.
 * Used by BaseCopilotWorkflowEditorService to parse the ARM backend response.
 */
export function parseCopilotResponse(content: string, currentWorkflow: Workflow): WorkflowEditResponse {
  const sanitized = content.replace(/\u200B|\u200C|\u200D|\uFEFF|\u00A0/g, '');

  const jsonBlockMatch = sanitized.match(/```(?:json)?\n?([\s\S]*?)```/i);
  const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : sanitized;
  const stripped = stripJsonComments(jsonStr.trim());

  const parsed = tryJsonParse(stripped) ?? tryJsonParse(repairJson(stripped)) ?? tryExtractJson(sanitized);

  if (parsed) {
    return buildResponseFromParsed(parsed, sanitized, currentWorkflow);
  }

  console.warn('[CopilotWorkflowEditor] Failed to parse LLM response as JSON.', {
    contentLength: sanitized.length,
    directParseError: getParseError(stripped),
    repairParseError: getParseError(repairJson(stripped)),
  });

  return { type: 'text', text: content };
}
