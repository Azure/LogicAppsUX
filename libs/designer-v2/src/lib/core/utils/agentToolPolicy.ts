import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

/**
 * Runtime provenance:
 * - TemplateValidationEngine.cs:40 (ToolNameInvalidCharacters)
 * - TemplateValidationEngine.cs:45-100 (SupportedAgenticActionTypes)
 * - TemplateValidationEngine.cs:1211-1360 (ValidateActionTool + AgentParameterSchema)
 * - FlowTemplateValidation.cs:387-390, 3039-3044 (MaxToolsLimit, default 25)
 * - FlowTemplateValidation.cs:1588-1643 (Agent handoff + McpClientTool workflow-kind checks)
 */
export const AGENT_TOOL_POLICY_RUNTIME_PROVENANCE = {
  repo: 'project-otto',
  commit: '3393993399a18cbb8d42f9efa0c7d2cca2ec2eb9',
  sources: {
    toolNameInvalidCharacters: 'TemplateValidationEngine.cs:40',
    supportedActionTypes: 'TemplateValidationEngine.cs:45-100',
    validateActionTool: 'TemplateValidationEngine.cs:1211-1360',
    maxToolsLimit: 'FlowTemplateValidation.cs:387-390,3039-3044',
    handoffAndMcpRules: 'FlowTemplateValidation.cs:1588-1643',
  },
} as const;

export const AGENT_TOOL_POLICY_MAX_TOOLS_LIMIT = 25;
export const AGENT_TOOL_POLICY_TOOL_NAME_MAX_LENGTH = 48;
export const AGENT_TOOL_POLICY_TOOL_DESCRIPTION_MAX_LENGTH = 1000;

const SUCCEEDED_RUN_AFTER_STATUS = 'Succeeded';
const JSON_SCHEMA_TYPES = new Set(['string', 'integer', 'number', 'boolean', 'array', 'object', 'null']);

const TOOL_NAME_INVALID_CHARACTERS = new Set([
  '!',
  '@',
  '#',
  '$',
  '%',
  '^',
  '&',
  '*',
  '(',
  ')',
  '+',
  '=',
  '-',
  '|',
  '[',
  ']',
  '{',
  '}',
  ';',
  ':',
  "'",
  '"',
  ',',
  '<',
  '>',
  '?',
  '/',
]);

const MCP_TOOL_ALLOWED_KINDS = new Set(['managed', 'builtin']);

const AGENT_TOOL_SUPPORTED_ACTION_TYPES = new Set([
  'Http',
  'Workflow',
  'Wait',
  'ApiConnection',
  'ApiConnectionWebhook',
  'ApiConnectionNotification',
  'HttpWebhook',
  'Compose',
  'Query',
  'Function',
  'ApiManagement',
  'XmlValidation',
  'XmlParse',
  'XmlCompose',
  'FlatFileEncoding',
  'FlatFileDecoding',
  'Xslt',
  'Terminate',
  'ParseJson',
  'Table',
  'Join',
  'Select',
  'AppendToArrayVariable',
  'AppendToStringVariable',
  'DecrementVariable',
  'IncrementVariable',
  'SetVariable',
  'InitializeVariable',
  'Expression',
  'Liquid',
  'JavaScriptCode',
  'As2Decode',
  'As2Encode',
  'RosettaNetDecode',
  'RosettaNetEncode',
  'RosettaNetWaitForResponse',
  'ArchiveZip',
  'ServiceProvider',
  'InvokeFunction',
  'PowershellCode',
  'CSharpScriptCode',
  'ChunkText',
  'ParseDocument',
  'ParseDocumentWithMetadata',
  'ChunkTextWithMetadata',
  'EdifactBatchEncode',
  'EdifactDecode',
  'EdifactEncode',
  'X12BatchEncode',
  'X12Decode',
  'X12Encode',
  'NestedAgent',
  'AgentHandOff',
]);

/**
 * Runtime source: FlowTemplateValidation.cs:247-275 (AgentWorkflowAllowedActions).
 * Tool validation intersects this list with SupportedAgenticActionTypes to keep both checks aligned.
 */
const AGENT_WORKFLOW_ALLOWED_ACTION_TYPES = new Set([
  'AgentHandOff',
  'ApiConnection',
  'Http',
  'ServiceProvider',
  'Compose',
  'AppendToArrayVariable',
  'AppendToStringVariable',
  'DecrementVariable',
  'IncrementVariable',
  'InitializeVariable',
  'SetVariable',
  'XmlCompose',
  'XmlParse',
  'XmlValidation',
  'CSharpScriptCode',
  'JavaScriptCode',
  'PowershellCode',
  'Expression',
  'ParseJson',
  'Table',
  'Join',
  'Select',
  'Query',
  'Xslt',
  'NestedAgent',
]);

export const AgentToolPolicyRuleId = {
  TOOLS_LIMIT_EXCEEDED: 'tools-limit-exceeded',
  TOOL_NAME_REQUIRED: 'tool-name-required',
  TOOL_NAME_TOO_LONG: 'tool-name-too-long',
  TOOL_NAME_INVALID_CHARACTERS: 'tool-name-invalid-characters',
  TOOL_DESCRIPTION_REQUIRED: 'tool-description-required',
  TOOL_DESCRIPTION_TOO_LONG: 'tool-description-too-long',
  TOOL_ACTIONS_REQUIRED: 'tool-actions-required',
  MCP_TOOL_ACTIONS_NOT_ALLOWED: 'mcp-tool-actions-not-allowed',
  MCP_TOOL_INPUTS_INVALID: 'mcp-tool-inputs-invalid',
  MCP_TOOL_KIND_INVALID: 'mcp-tool-kind-invalid',
  MCP_TOOL_CONNECTION_REFERENCE_REQUIRED: 'mcp-tool-connection-reference-required',
  MCP_TOOL_CONNECTION_REFERENCE_NAME_REQUIRED: 'mcp-tool-connection-reference-name-required',
  MCP_TOOL_SERVER_PATH_INVALID: 'mcp-tool-server-path-invalid',
  MCP_TOOL_SERVER_PATH_NOT_SUPPORTED: 'mcp-tool-server-path-not-supported',
  MCP_TOOL_ALLOWED_TOOLS_INVALID: 'mcp-tool-allowed-tools-invalid',
  ACTION_TYPE_NOT_SUPPORTED: 'action-type-not-supported',
  ACTION_TYPE_NOT_ALLOWED_FOR_WORKFLOW_KIND: 'action-type-not-allowed-for-workflow-kind',
  TOOL_MULTIPLE_PREDECESSORS_NOT_ALLOWED: 'tool-multiple-predecessors-not-allowed',
  TOOL_SHARED_PREDECESSOR_NOT_ALLOWED: 'tool-shared-predecessor-not-allowed',
  TOOL_START_NODE_COUNT_INVALID: 'tool-start-node-count-invalid',
  TOOL_RUN_AFTER_STATUS_NOT_SUPPORTED: 'tool-run-after-status-not-supported',
  TOOL_MISSING_PREDECESSOR: 'tool-missing-predecessor',
  TOOL_GRAPH_DISCONNECTED: 'tool-graph-disconnected',
  TOOL_GRAPH_CYCLE_DETECTED: 'tool-graph-cycle-detected',
  TOOL_HANDOFF_MULTIPLE_NOT_ALLOWED: 'tool-handoff-multiple-not-allowed',
  TOOL_HANDOFF_MUST_BE_TERMINAL: 'tool-handoff-must-be-terminal',
  TOOL_HANDOFF_NOT_ALLOWED_FOR_WORKFLOW_KIND: 'tool-handoff-not-allowed-for-workflow-kind',
  TOOL_PARAMETER_SCHEMA_ROOT_OBJECT_REQUIRED: 'tool-parameter-schema-root-object-required',
  TOOL_PARAMETER_SCHEMA_PATTERN_NOT_ALLOWED: 'tool-parameter-schema-pattern-not-allowed',
  TOOL_PARAMETER_SCHEMA_PROPERTY_NULL: 'tool-parameter-schema-property-null',
  TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID: 'tool-parameter-schema-property-type-invalid',
  TOOL_PARAMETER_SCHEMA_REQUIRED_INVALID: 'tool-parameter-schema-required-invalid',
} as const;

export type AgentToolPolicyRuleId = (typeof AgentToolPolicyRuleId)[keyof typeof AgentToolPolicyRuleId];

export interface AgentToolPolicyViolation {
  readonly ruleId: AgentToolPolicyRuleId;
  readonly message: string;
  readonly path: string;
  readonly toolName?: string;
  readonly actionName?: string;
}

export interface AgentToolPolicyResult {
  readonly isValid: boolean;
  readonly violations: readonly AgentToolPolicyViolation[];
}

export interface AgentToolPolicyValidationInput {
  readonly tools?: Record<string, LogicAppsV2.AgentCondition | LogicAppsV2.McpClient | undefined>;
  readonly workflowKind?: string;
  readonly maxToolsLimit?: number;
}

type FlattenedAction = {
  readonly name: string;
  readonly action: LogicAppsV2.Action;
};

export const validateAgentToolPolicy = (input: AgentToolPolicyValidationInput): AgentToolPolicyResult => {
  const tools = input.tools ?? {};
  const isAgentWorkflow = isAgentWorkflowKind(input.workflowKind);
  const resolvedToolsLimit =
    typeof input.maxToolsLimit === 'number' && Number.isFinite(input.maxToolsLimit) && input.maxToolsLimit > 0
      ? Math.floor(input.maxToolsLimit)
      : AGENT_TOOL_POLICY_MAX_TOOLS_LIMIT;
  const violations: AgentToolPolicyViolation[] = [];
  const dedupeKeys = new Set<string>();

  const addViolation = (violation: AgentToolPolicyViolation): void => {
    const dedupeKey = [violation.ruleId, violation.path, violation.toolName ?? '', violation.actionName ?? ''].join('|');
    if (dedupeKeys.has(dedupeKey)) {
      return;
    }

    dedupeKeys.add(dedupeKey);
    violations.push(violation);
  };

  const toolEntries = Object.entries(tools);
  // Runtime source: FlowTemplateValidation.cs:387-390,3039-3044.
  if (toolEntries.length > resolvedToolsLimit) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOLS_LIMIT_EXCEEDED,
      message: `Agent has ${toolEntries.length} tools. The runtime limit is ${resolvedToolsLimit}.`,
      path: 'tools',
    });
  }

  for (const [toolName, tool] of toolEntries) {
    if (!tool) {
      continue;
    }

    if (isMcpClientTool(tool)) {
      // Runtime source: FlowTemplateValidation.cs:1369-1375,1583-1643.
      if (isAgentWorkflow) {
        validateMcpTool(toolName, tool, addViolation);

        if (Object.keys(tool.actions ?? {}).length > 0) {
          addViolation({
            ruleId: AgentToolPolicyRuleId.MCP_TOOL_ACTIONS_NOT_ALLOWED,
            message: `McpClientTool '${toolName}' cannot define actions.`,
            path: `tools.${toolName}.actions`,
            toolName,
          });
        }
      }

      continue;
    }

    // Runtime source: TemplateValidationEngine.cs:1211-1232.
    validateToolName(toolName, addViolation);

    // Runtime source: TemplateValidationEngine.cs:1235-1248.
    validateToolDescription(toolName, tool, addViolation);
    // Runtime source: TemplateValidationEngine.cs:1311-1355.
    validateAgentParameterSchema(toolName, tool.agentParameterSchema, addViolation);

    const actions = tool.actions ?? {};
    if (Object.keys(actions).length === 0) {
      // Runtime source: TemplateValidationEngine.cs:1255-1260.
      addViolation({
        ruleId: AgentToolPolicyRuleId.TOOL_ACTIONS_REQUIRED,
        message: `Tool '${toolName}' must define at least one action.`,
        path: `tools.${toolName}.actions`,
        toolName,
      });
      continue;
    }

    const flattenedActions = flattenNestedActions(actions);
    const allowedActionTypes = getSupportedActionTypesForWorkflowKind(input.workflowKind);

    for (const { name: actionName, action } of flattenedActions) {
      const actionType = normalizeActionType(action.type);
      // Runtime source: TemplateValidationEngine.cs:45-100,1262-1270.
      if (!actionType || !AGENT_TOOL_SUPPORTED_ACTION_TYPES.has(actionType)) {
        addViolation({
          ruleId: AgentToolPolicyRuleId.ACTION_TYPE_NOT_SUPPORTED,
          message: `Action '${actionName}' in tool '${toolName}' uses unsupported type '${action.type ?? 'unknown'}'.`,
          path: `tools.${toolName}.actions.${actionName}.type`,
          toolName,
          actionName,
        });
      } else if (!allowedActionTypes.has(actionType)) {
        addViolation({
          ruleId: AgentToolPolicyRuleId.ACTION_TYPE_NOT_ALLOWED_FOR_WORKFLOW_KIND,
          message: `Action '${actionName}' in tool '${toolName}' is not allowed for workflow kind '${input.workflowKind ?? 'unknown'}'.`,
          path: `tools.${toolName}.actions.${actionName}.type`,
          toolName,
          actionName,
        });
      }
    }

    validateToolTopology(toolName, flattenedActions, addViolation);
    // Runtime source: FlowTemplateValidation.cs:1369-1375,1622-1636.
    if (isAgentWorkflow) {
      validateAgentHandoffRules(toolName, flattenedActions, addViolation);
    }
  }

  const sortedViolations = violations.sort((a, b) =>
    `${a.path}|${a.ruleId}|${a.toolName ?? ''}|${a.actionName ?? ''}`.localeCompare(
      `${b.path}|${b.ruleId}|${b.toolName ?? ''}|${b.actionName ?? ''}`
    )
  );

  return {
    isValid: sortedViolations.length === 0,
    violations: sortedViolations,
  };
};

const validateToolName = (toolName: string, addViolation: (violation: AgentToolPolicyViolation) => void): void => {
  if (!toolName || toolName.trim().length === 0) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_NAME_REQUIRED,
      message: 'Tool name is required.',
      path: 'tools',
      toolName,
    });
    return;
  }

  // Runtime source: TemplateValidationEngine.cs:1220-1232.
  if (toolName.length > AGENT_TOOL_POLICY_TOOL_NAME_MAX_LENGTH) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_NAME_TOO_LONG,
      message: `Tool '${toolName}' exceeds the ${AGENT_TOOL_POLICY_TOOL_NAME_MAX_LENGTH}-character limit.`,
      path: `tools.${toolName}`,
      toolName,
    });
  }

  const invalidCharacters = [...toolName].filter(
    (character) => TOOL_NAME_INVALID_CHARACTERS.has(character) || character.charCodeAt(0) > 127 || /\s/.test(character)
  );
  if (invalidCharacters.length > 0) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_NAME_INVALID_CHARACTERS,
      message: `Tool '${toolName}' contains invalid characters: '${[...new Set(invalidCharacters)].join('')}'.`,
      path: `tools.${toolName}`,
      toolName,
    });
  }
};

const validateToolDescription = (
  toolName: string,
  tool: LogicAppsV2.AgentCondition | LogicAppsV2.McpClient,
  addViolation: (violation: AgentToolPolicyViolation) => void
): void => {
  const description = (tool as LogicAppsV2.AgentCondition).description;
  if (!description || description.length === 0) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_DESCRIPTION_REQUIRED,
      message: `Tool '${toolName}' must provide a description.`,
      path: `tools.${toolName}.description`,
      toolName,
    });
    return;
  }

  if (description.length > AGENT_TOOL_POLICY_TOOL_DESCRIPTION_MAX_LENGTH) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_DESCRIPTION_TOO_LONG,
      message: `Tool '${toolName}' description exceeds the ${AGENT_TOOL_POLICY_TOOL_DESCRIPTION_MAX_LENGTH}-character limit.`,
      path: `tools.${toolName}.description`,
      toolName,
    });
  }
};

const validateAgentParameterSchema = (
  toolName: string,
  schema: unknown,
  addViolation: (violation: AgentToolPolicyViolation) => void
): void => {
  if (schema === undefined || schema === null) {
    return;
  }

  if (containsRegexSchemaKeyword(schema)) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PATTERN_NOT_ALLOWED,
      message: `Tool '${toolName}' parameter schema cannot include 'pattern' or 'patternProperties'.`,
      path: `tools.${toolName}.agentParameterSchema`,
      toolName,
    });
  }

  if (!isObjectLike(schema) || Array.isArray(schema)) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_ROOT_OBJECT_REQUIRED,
      message: `Tool '${toolName}' parameter schema must be a JSON object with type 'object'.`,
      path: `tools.${toolName}.agentParameterSchema`,
      toolName,
    });
    return;
  }

  const rootType = normalizeSchemaTypes((schema as Record<string, unknown>).type);
  if (rootType.isMalformed || rootType.types.length !== 1 || rootType.types[0] !== 'object') {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_ROOT_OBJECT_REQUIRED,
      message: `Tool '${toolName}' parameter schema root type must be 'object'.`,
      path: `tools.${toolName}.agentParameterSchema.type`,
      toolName,
    });
  }

  if (containsMalformedSchemaTypeDeclaration(schema)) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID,
      message: `Tool '${toolName}' parameter schema contains malformed schema keyword values.`,
      path: `tools.${toolName}.agentParameterSchema`,
      toolName,
    });
  }

  const propertiesCandidate = (schema as Record<string, unknown>).properties;
  if ('properties' in (schema as Record<string, unknown>) && (!isObjectLike(propertiesCandidate) || Array.isArray(propertiesCandidate))) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_NULL,
      message: `Tool '${toolName}' parameter schema 'properties' must be an object.`,
      path: `tools.${toolName}.agentParameterSchema.properties`,
      toolName,
    });
  }

  const properties = isObjectLike(propertiesCandidate) && !Array.isArray(propertiesCandidate) ? propertiesCandidate : undefined;
  if (properties) {
    for (const [propertyName, propertySchema] of Object.entries(properties)) {
      if (!isObjectLike(propertySchema) || Array.isArray(propertySchema)) {
        addViolation({
          ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_NULL,
          message: `Tool '${toolName}' parameter schema property '${propertyName}' must be an object.`,
          path: `tools.${toolName}.agentParameterSchema.properties.${propertyName}`,
          toolName,
        });
        continue;
      }

      const resolvedPropertySchema = resolveLocalSchemaReference(schema, propertySchema);
      if (resolvedPropertySchema.unresolvedRef || containsMalformedSchemaTypeDeclaration(resolvedPropertySchema.schema)) {
        addViolation({
          ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID,
          message: `Tool '${toolName}' parameter schema property '${propertyName}' has an invalid type declaration.`,
          path: `tools.${toolName}.agentParameterSchema.properties.${propertyName}.type`,
          toolName,
        });
        continue;
      }

      const propertyTypeValue = (resolvedPropertySchema.schema as Record<string, unknown>).type;
      const types = normalizeSchemaTypes(propertyTypeValue);
      if ('type' in propertySchema && (types.types.length === 0 || types.isMalformed)) {
        addViolation({
          ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID,
          message: `Tool '${toolName}' parameter schema property '${propertyName}' has an invalid type declaration.`,
          path: `tools.${toolName}.agentParameterSchema.properties.${propertyName}.type`,
          toolName,
        });
        continue;
      }

      if (types.types.length === 0) {
        continue;
      }

      /**
       * Runtime source: TemplateValidationEngine.cs:1336-1340.
       * The runtime rejects only object-typed parameter properties. Nullable and union types pass.
       */
      const uniqueTypes = new Set(types.types);
      if (uniqueTypes.size === 1 && uniqueTypes.has('object')) {
        addViolation({
          ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID,
          message: `Tool '${toolName}' parameter schema property '${propertyName}' cannot use type 'object'.`,
          path: `tools.${toolName}.agentParameterSchema.properties.${propertyName}.type`,
          toolName,
        });
      }
    }
  }

  const required = (schema as Record<string, unknown>).required;
  if ('required' in (schema as Record<string, unknown>) && !Array.isArray(required)) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_REQUIRED_INVALID,
      message: `Tool '${toolName}' parameter schema required list must be an array of property names.`,
      path: `tools.${toolName}.agentParameterSchema.required`,
      toolName,
    });
    return;
  }

  if (Array.isArray(required)) {
    const invalidRequired = required.some(
      (requiredProperty) =>
        typeof requiredProperty !== 'string' || !Object.prototype.hasOwnProperty.call(properties ?? {}, requiredProperty)
    );
    if (invalidRequired) {
      addViolation({
        ruleId: AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_REQUIRED_INVALID,
        message: `Tool '${toolName}' parameter schema contains required properties that are not defined.`,
        path: `tools.${toolName}.agentParameterSchema.required`,
        toolName,
      });
    }
  }
};

const validateToolTopology = (
  toolName: string,
  flattenedActions: readonly FlattenedAction[],
  addViolation: (violation: AgentToolPolicyViolation) => void
): void => {
  const actionNamesByNormalizedName = new Map(flattenedActions.map(({ name }) => [name.toLowerCase(), name] as const));
  const predecessorUseCount = new Map<string, number>();
  const successorsByAction = new Map<string, string[]>();
  const predecessorsByAction = new Map<string, string[]>();
  const startNodes: string[] = [];

  for (const { name: actionName, action } of flattenedActions) {
    const runAfter = action.runAfter ?? {};
    const predecessors = Object.keys(runAfter);
    const resolvedPredecessors: string[] = [];

    if (predecessors.length === 0) {
      startNodes.push(actionName);
    }

    // Runtime source: TemplateValidationEngine.cs:1272-1277.
    if (predecessors.length > 1) {
      addViolation({
        ruleId: AgentToolPolicyRuleId.TOOL_MULTIPLE_PREDECESSORS_NOT_ALLOWED,
        message: `Action '${actionName}' in tool '${toolName}' cannot depend on multiple predecessors.`,
        path: `tools.${toolName}.actions.${actionName}.runAfter`,
        toolName,
        actionName,
      });
    }

    for (const predecessor of predecessors) {
      const normalizedPredecessor = predecessor.toLowerCase();
      const predecessorActionName = actionNamesByNormalizedName.get(normalizedPredecessor);
      if (predecessorActionName) {
        resolvedPredecessors.push(predecessorActionName);
        predecessorUseCount.set(predecessorActionName, (predecessorUseCount.get(predecessorActionName) ?? 0) + 1);
        const successors = successorsByAction.get(predecessorActionName) ?? [];
        successors.push(actionName);
        successorsByAction.set(predecessorActionName, successors);
      } else {
        addViolation({
          ruleId: AgentToolPolicyRuleId.TOOL_MISSING_PREDECESSOR,
          message: `Action '${actionName}' in tool '${toolName}' references missing predecessor '${predecessor}'.`,
          path: `tools.${toolName}.actions.${actionName}.runAfter.${predecessor}`,
          toolName,
          actionName,
        });
      }

      const statuses = runAfter[predecessor] ?? [];
      // Runtime source: TemplateValidationEngine.cs:1295-1300 (+ general runAfter status validation).
      const hasInvalidStatuses = statuses.length !== 1 || statuses[0] !== SUCCEEDED_RUN_AFTER_STATUS;
      if (hasInvalidStatuses) {
        addViolation({
          ruleId: AgentToolPolicyRuleId.TOOL_RUN_AFTER_STATUS_NOT_SUPPORTED,
          message: `Action '${actionName}' in tool '${toolName}' must use '${SUCCEEDED_RUN_AFTER_STATUS}' in runAfter.`,
          path: `tools.${toolName}.actions.${actionName}.runAfter.${predecessor}`,
          toolName,
          actionName,
        });
      }
    }

    predecessorsByAction.set(actionName, resolvedPredecessors);
  }

  // Runtime source: TemplateValidationEngine.cs:1281-1288.
  for (const [predecessor, useCount] of predecessorUseCount.entries()) {
    if (useCount > 1) {
      addViolation({
        ruleId: AgentToolPolicyRuleId.TOOL_SHARED_PREDECESSOR_NOT_ALLOWED,
        message: `Tool '${toolName}' cannot branch from predecessor '${predecessor}'.`,
        path: `tools.${toolName}.actions`,
        toolName,
      });
    }
  }

  // Runtime source: TemplateValidationEngine.cs:1290-1294.
  if (startNodes.length !== 1) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_START_NODE_COUNT_INVALID,
      message: `Tool '${toolName}' must have exactly one starting action.`,
      path: `tools.${toolName}.actions`,
      toolName,
    });
  }

  if (startNodes.length > 0) {
    const visited = new Set<string>();
    const queue: string[] = [startNodes[0]];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }

      visited.add(current);
      const successors = successorsByAction.get(current) ?? [];
      queue.push(...successors);
    }

    if (visited.size !== flattenedActions.length) {
      addViolation({
        ruleId: AgentToolPolicyRuleId.TOOL_GRAPH_DISCONNECTED,
        message: `Tool '${toolName}' actions must form one connected chain.`,
        path: `tools.${toolName}.actions`,
        toolName,
      });
    }
  }

  if (hasCycle(flattenedActions, predecessorsByAction)) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_GRAPH_CYCLE_DETECTED,
      message: `Tool '${toolName}' actions cannot contain runAfter cycles.`,
      path: `tools.${toolName}.actions`,
      toolName,
    });
  }
};

const validateAgentHandoffRules = (
  toolName: string,
  flattenedActions: readonly FlattenedAction[],
  addViolation: (violation: AgentToolPolicyViolation) => void
): void => {
  const handoffActions = flattenedActions.filter(({ action }) => normalizeActionType(action.type) === 'AgentHandOff');
  if (handoffActions.length === 0) {
    return;
  }

  if (handoffActions.length > 1) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.TOOL_HANDOFF_MULTIPLE_NOT_ALLOWED,
      message: `Tool '${toolName}' can contain at most one AgentHandOff action.`,
      path: `tools.${toolName}.actions`,
      toolName,
    });
  }

  const handoffNamesByNormalizedName = new Set(handoffActions.map(({ name }) => name.toLowerCase()));
  for (const { name: actionName, action } of flattenedActions) {
    const predecessorNames = Object.keys(action.runAfter ?? {});
    if (predecessorNames.some((predecessorName) => handoffNamesByNormalizedName.has(predecessorName.toLowerCase()))) {
      addViolation({
        ruleId: AgentToolPolicyRuleId.TOOL_HANDOFF_MUST_BE_TERMINAL,
        message: `Tool '${toolName}' cannot run action '${actionName}' after AgentHandOff.`,
        path: `tools.${toolName}.actions.${actionName}.runAfter`,
        toolName,
        actionName,
      });
    }
  }
};

const flattenNestedActions = (actions: LogicAppsV2.Actions | undefined): FlattenedAction[] => {
  if (!actions) {
    return [];
  }

  const flattened: FlattenedAction[] = [];
  const visitActions = (actionMap: LogicAppsV2.Actions | undefined): void => {
    if (!actionMap) {
      return;
    }

    for (const [actionName, action] of Object.entries(actionMap)) {
      flattened.push({ name: actionName, action });

      visitActions((action as LogicAppsV2.ScopeAction).actions);
      visitActions((action as LogicAppsV2.IfAction).else?.actions);
      visitActions((action as LogicAppsV2.SwitchAction).default?.actions);

      const cases = (action as LogicAppsV2.SwitchAction).cases;
      if (cases) {
        for (const caseAction of Object.values(cases)) {
          visitActions(caseAction.actions);
        }
      }

      const nestedTools = (action as LogicAppsV2.AgentAction).tools;
      if (nestedTools) {
        for (const nestedTool of Object.values(nestedTools)) {
          visitActions((nestedTool as LogicAppsV2.AgentCondition).actions);
        }
      }
    }
  };

  visitActions(actions);
  return flattened;
};

const hasCycle = (flattenedActions: readonly FlattenedAction[], predecessorsByAction: ReadonlyMap<string, readonly string[]>): boolean => {
  const colorByAction = new Map<string, 0 | 1 | 2>();
  for (const { name } of flattenedActions) {
    colorByAction.set(name, 0);
  }

  const hasCycleInNode = (actionName: string): boolean => {
    const color = colorByAction.get(actionName) ?? 0;
    if (color === 1) {
      return true;
    }

    if (color === 2) {
      return false;
    }

    colorByAction.set(actionName, 1);

    const predecessors = predecessorsByAction.get(actionName) ?? [];
    for (const predecessor of predecessors) {
      if (!colorByAction.has(predecessor)) {
        continue;
      }

      if (hasCycleInNode(predecessor)) {
        return true;
      }
    }

    colorByAction.set(actionName, 2);
    return false;
  };

  for (const { name } of flattenedActions) {
    if ((colorByAction.get(name) ?? 0) === 0 && hasCycleInNode(name)) {
      return true;
    }
  }

  return false;
};

const getSupportedActionTypesForWorkflowKind = (workflowKind: string | undefined): ReadonlySet<string> => {
  if (!isAgentWorkflowKind(workflowKind)) {
    return AGENT_TOOL_SUPPORTED_ACTION_TYPES;
  }

  return new Set([...AGENT_TOOL_SUPPORTED_ACTION_TYPES].filter((actionType) => AGENT_WORKFLOW_ALLOWED_ACTION_TYPES.has(actionType)));
};

const isAgentWorkflowKind = (workflowKind: string | undefined): boolean => {
  const normalizedKind = workflowKind?.trim().toLowerCase();
  return normalizedKind === 'agent';
};

const normalizeActionType = (actionType: string | undefined): string | undefined => {
  if (!actionType) {
    return undefined;
  }

  const value = actionType.trim();
  return [...AGENT_TOOL_SUPPORTED_ACTION_TYPES].find((supportedType) => supportedType.toLowerCase() === value.toLowerCase());
};

const isMcpClientTool = (tool: LogicAppsV2.AgentCondition | LogicAppsV2.McpClient): boolean => {
  return typeof tool.type === 'string' && tool.type.toLowerCase() === 'mcpclienttool';
};

const isObjectLike = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const normalizeSchemaTypes = (typeValue: unknown): { types: string[]; isMalformed: boolean } => {
  if (typeValue === undefined) {
    return { types: [], isMalformed: false };
  }

  if (typeof typeValue === 'string') {
    const normalizedType = typeValue.toLowerCase();
    return {
      types: [normalizedType],
      isMalformed: !JSON_SCHEMA_TYPES.has(normalizedType),
    };
  }

  if (Array.isArray(typeValue)) {
    const types: string[] = [];
    let isMalformed = false;
    for (const value of typeValue) {
      if (typeof value !== 'string') {
        isMalformed = true;
        continue;
      }

      const normalizedType = value.toLowerCase();
      if (!JSON_SCHEMA_TYPES.has(normalizedType)) {
        isMalformed = true;
        continue;
      }

      types.push(normalizedType);
    }

    return { types, isMalformed };
  }

  return { types: [], isMalformed: true };
};

const SCHEMA_MAP_KEY_CONTAINERS = new Set(['properties', 'definitions', '$defs', 'patternproperties', 'dependentschemas']);
const SCHEMA_ANNOTATION_KEYS = new Set(['default', 'examples', 'enum', 'const']);

const containsMalformedSchemaTypeDeclaration = (node: unknown, parentIsSchemaMap = false): boolean => {
  if (Array.isArray(node)) {
    return node.some((item) => containsMalformedSchemaTypeDeclaration(item, parentIsSchemaMap));
  }

  if (!isObjectLike(node)) {
    return false;
  }

  for (const [key, value] of Object.entries(node)) {
    const normalizedKey = key.toLowerCase();
    if (!parentIsSchemaMap && SCHEMA_ANNOTATION_KEYS.has(normalizedKey)) {
      continue;
    }

    if (!parentIsSchemaMap && (normalizedKey === 'allof' || normalizedKey === 'anyof' || normalizedKey === 'oneof')) {
      if (!Array.isArray(value) || value.some((item) => !isObjectLike(item) || Array.isArray(item))) {
        return true;
      }
    }

    if (!parentIsSchemaMap && normalizedKey === 'not' && (!isObjectLike(value) || Array.isArray(value))) {
      return true;
    }

    if (!parentIsSchemaMap && normalizedKey === 'required') {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        return true;
      }
    }

    if (!parentIsSchemaMap && SCHEMA_MAP_KEY_CONTAINERS.has(normalizedKey)) {
      if (!isObjectLike(value) || Array.isArray(value)) {
        return true;
      }

      const hasInvalidNestedSchema = Object.values(value).some(
        (nestedSchema) => !isObjectLike(nestedSchema) || Array.isArray(nestedSchema)
      );
      if (hasInvalidNestedSchema) {
        return true;
      }
    }

    if (!parentIsSchemaMap && normalizedKey === 'items') {
      const isValidItemsSchema =
        isObjectLike(value) || (Array.isArray(value) && value.every((item) => isObjectLike(item) && !Array.isArray(item)));
      if (!isValidItemsSchema) {
        return true;
      }
    }

    if (!parentIsSchemaMap && normalizedKey === 'type' && normalizeSchemaTypes(value).isMalformed) {
      return true;
    }

    const childIsSchemaMap = !parentIsSchemaMap && SCHEMA_MAP_KEY_CONTAINERS.has(normalizedKey);
    if (containsMalformedSchemaTypeDeclaration(value, childIsSchemaMap)) {
      return true;
    }
  }

  return false;
};

const containsRegexSchemaKeyword = (node: unknown, parentIsSchemaMap = false): boolean => {
  if (!isObjectLike(node)) {
    return false;
  }

  for (const [key, value] of Object.entries(node)) {
    const normalizedKey = key.toLowerCase();
    if (!parentIsSchemaMap && SCHEMA_ANNOTATION_KEYS.has(normalizedKey)) {
      continue;
    }

    if (!parentIsSchemaMap && normalizedKey === 'pattern') {
      if (value !== null && value !== undefined) {
        return true;
      }
    }

    if (!parentIsSchemaMap && normalizedKey === 'patternproperties') {
      if (isObjectLike(value) && !Array.isArray(value) && Object.keys(value).length > 0) {
        return true;
      }
    }

    const childIsSchemaMap = !parentIsSchemaMap && SCHEMA_MAP_KEY_CONTAINERS.has(normalizedKey);
    if (containsRegexSchemaKeyword(value, childIsSchemaMap)) {
      return true;
    }
  }

  return false;
};

const validateMcpTool = (
  toolName: string,
  tool: LogicAppsV2.AgentCondition | LogicAppsV2.McpClient,
  addViolation: (violation: AgentToolPolicyViolation) => void
): void => {
  const rawKind = typeof tool.kind === 'string' ? tool.kind.trim() : '';
  const normalizedKind = rawKind.toLowerCase();
  if (!MCP_TOOL_ALLOWED_KINDS.has(normalizedKind)) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.MCP_TOOL_KIND_INVALID,
      message: `McpClientTool '${toolName}' kind must be BuiltIn or Managed.`,
      path: `tools.${toolName}.kind`,
      toolName,
    });
  }

  const rawInputs = (tool as unknown as { inputs?: unknown }).inputs;
  if (!isObjectLike(rawInputs) || Array.isArray(rawInputs)) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.MCP_TOOL_INPUTS_INVALID,
      message: `McpClientTool '${toolName}' has invalid inputs.`,
      path: `tools.${toolName}.inputs`,
      toolName,
    });
    return;
  }

  const connectionReference = (rawInputs as Record<string, unknown>).connectionReference;
  if (!isObjectLike(connectionReference) || Array.isArray(connectionReference)) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.MCP_TOOL_CONNECTION_REFERENCE_REQUIRED,
      message: `McpClientTool '${toolName}' must define inputs.connectionReference.`,
      path: `tools.${toolName}.inputs.connectionReference`,
      toolName,
    });
  } else {
    const connectionName = (connectionReference as Record<string, unknown>).connectionName;
    if (typeof connectionName !== 'string' || connectionName.length === 0) {
      addViolation({
        ruleId: AgentToolPolicyRuleId.MCP_TOOL_CONNECTION_REFERENCE_NAME_REQUIRED,
        message: `McpClientTool '${toolName}' must define a non-empty connection reference name.`,
        path: `tools.${toolName}.inputs.connectionReference.connectionName`,
        toolName,
      });
    }
  }

  const parameters = (rawInputs as Record<string, unknown>).parameters;
  const mcpServerPath = isObjectLike(parameters) ? (parameters as Record<string, unknown>).mcpServerPath : undefined;

  if (normalizedKind === 'managed') {
    if (typeof mcpServerPath !== 'string' || mcpServerPath.length === 0 || hasParentPathTraversal(mcpServerPath)) {
      addViolation({
        ruleId: AgentToolPolicyRuleId.MCP_TOOL_SERVER_PATH_INVALID,
        message: `Managed McpClientTool '${toolName}' must define a valid mcpServerPath without parent traversal.`,
        path: `tools.${toolName}.inputs.parameters.mcpServerPath`,
        toolName,
      });
    }
  } else if (typeof mcpServerPath === 'string' && mcpServerPath.length > 0) {
    addViolation({
      ruleId: AgentToolPolicyRuleId.MCP_TOOL_SERVER_PATH_NOT_SUPPORTED,
      message: `BuiltIn McpClientTool '${toolName}' does not support mcpServerPath.`,
      path: `tools.${toolName}.inputs.parameters.mcpServerPath`,
      toolName,
    });
  }

  const allowedTools = isObjectLike(parameters) ? (parameters as Record<string, unknown>).allowedTools : undefined;
  if (allowedTools !== undefined && allowedTools !== null) {
    const hasInvalidAllowedTools =
      !Array.isArray(allowedTools) || allowedTools.some((allowedTool) => allowedTool === null || allowedTool === undefined);
    if (hasInvalidAllowedTools) {
      addViolation({
        ruleId: AgentToolPolicyRuleId.MCP_TOOL_ALLOWED_TOOLS_INVALID,
        message: `McpClientTool '${toolName}' allowedTools must not include null entries.`,
        path: `tools.${toolName}.inputs.parameters.allowedTools`,
        toolName,
      });
    }
  }
};

const hasParentPathTraversal = (pathValue: string): boolean => {
  try {
    return decodeURIComponent(pathValue).includes('../');
  } catch {
    return true;
  }
};

const resolveLocalSchemaReference = (
  rootSchema: unknown,
  schemaNode: Record<string, unknown>
): { schema: Record<string, unknown>; unresolvedRef: boolean } => {
  let resolvedNode: Record<string, unknown> = schemaNode;
  const visitedRefs = new Set<string>();

  while (typeof resolvedNode.$ref === 'string') {
    const ref = resolvedNode.$ref;
    if (!ref.startsWith('#/') || visitedRefs.has(ref)) {
      return { schema: resolvedNode, unresolvedRef: true };
    }

    const referencedNode = getSchemaNodeByJsonPointer(rootSchema, ref);
    if (!isObjectLike(referencedNode) || Array.isArray(referencedNode)) {
      return { schema: resolvedNode, unresolvedRef: true };
    }

    visitedRefs.add(ref);
    const localNode = { ...resolvedNode };
    delete localNode.$ref;
    const mergedNode = { ...(referencedNode as Record<string, unknown>), ...localNode };
    resolvedNode = mergedNode;
  }

  return { schema: resolvedNode, unresolvedRef: false };
};

const getSchemaNodeByJsonPointer = (rootSchema: unknown, jsonPointer: string): unknown => {
  if (!jsonPointer.startsWith('#/')) {
    return undefined;
  }

  const parts = jsonPointer
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = rootSchema;
  for (const part of parts) {
    if (!isObjectLike(current) || Array.isArray(current) || !(part in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
};
