import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AGENT_TOOL_POLICY_MAX_TOOLS_LIMIT,
  AGENT_TOOL_POLICY_TOOL_DESCRIPTION_MAX_LENGTH,
  AGENT_TOOL_POLICY_TOOL_NAME_MAX_LENGTH,
  AgentToolPolicyRuleId,
  validateAgentToolPolicy,
} from '../agentToolPolicy';

type FixtureCase = {
  readonly id: string;
  readonly workflowKind?: string;
  readonly tools?: Record<string, any>;
  readonly expectedValid: boolean;
  readonly expectedRuleIds: readonly string[];
};

type FixtureCorpus = {
  readonly fixtureVersion: string;
  readonly runtimeProvenance: {
    readonly repo: string;
    readonly commit: string;
    readonly sources: readonly string[];
  };
  readonly cases: readonly FixtureCase[];
};

const fixtureCorpus = JSON.parse(
  readFileSync(new URL('./fixtures/agent-tool-policy.v1.runtime-3393993399a18cbb8d42f9efa0c7d2cca2ec2eb9.json', import.meta.url), 'utf-8')
) as FixtureCorpus;

describe('agentToolPolicy fixtures', () => {
  it('records runtime provenance and fixture version', () => {
    expect(fixtureCorpus.fixtureVersion).toBe('1.0.0');
    expect(fixtureCorpus.runtimeProvenance.repo).toBe('project-otto');
    expect(fixtureCorpus.runtimeProvenance.commit).toBe('3393993399a18cbb8d42f9efa0c7d2cca2ec2eb9');
    expect(fixtureCorpus.runtimeProvenance.sources.length).toBeGreaterThan(0);
  });

  it.each(fixtureCorpus.cases.map((fixtureCase) => [fixtureCase.id, fixtureCase] as const))(
    'validates fixture case: %s',
    (_id, fixtureCase) => {
      const result = validateAgentToolPolicy({
        tools: fixtureCase.tools,
        workflowKind: fixtureCase.workflowKind,
      });

      expect(result.isValid).toBe(fixtureCase.expectedValid);
      for (const expectedRuleId of fixtureCase.expectedRuleIds) {
        expect(result.violations.some((violation) => violation.ruleId === expectedRuleId)).toBe(true);
      }
    }
  );
});

describe('agentToolPolicy additional rule checks', () => {
  it('fails when the total tool count exceeds 25', () => {
    const tools: Record<string, any> = {};
    for (let index = 0; index <= AGENT_TOOL_POLICY_MAX_TOOLS_LIMIT; index++) {
      tools[`Tool${index.toString().padStart(2, '0')}`] = {
        description: 'tool',
        actions: {
          A: {
            type: 'Compose',
            runAfter: {},
          },
        },
      };
    }

    const result = validateAgentToolPolicy({ workflowKind: 'agent', tools });
    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOLS_LIMIT_EXCEEDED)).toBe(true);
  });

  it('honors an explicit maxToolsLimit override', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      maxToolsLimit: 1,
      tools: {
        ToolA: {
          description: 'a',
          actions: { A: { type: 'Compose', runAfter: {} } },
        },
        ToolB: {
          description: 'b',
          actions: { A: { type: 'Compose', runAfter: {} } },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOLS_LIMIT_EXCEEDED)).toBe(true);
  });

  it('fails tool name and description limits', () => {
    const tooLongName = 'A'.repeat(AGENT_TOOL_POLICY_TOOL_NAME_MAX_LENGTH + 1);
    const tooLongDescription = 'd'.repeat(AGENT_TOOL_POLICY_TOOL_DESCRIPTION_MAX_LENGTH + 1);
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        [tooLongName]: {
          description: tooLongDescription,
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_NAME_TOO_LONG)).toBe(true);
    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_DESCRIPTION_TOO_LONG)).toBe(true);
  });

  it('fails parameter schema object-typed properties and invalid required references', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        SchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            required: ['missing'],
            properties: {
              payload: {
                type: 'object',
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID)
    ).toBe(true);
    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_REQUIRED_INVALID)).toBe(
      true
    );
  });

  it('allows an actionless MCP tool without requiring action-tool description rules', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        McpTool: {
          type: 'McpClientTool',
          kind: 'Managed',
          inputs: {
            connectionReference: {
              connectionName: 'mcpConnection',
            },
            parameters: {
              mcpServerPath: '/servers/filesystem',
            },
          },
        },
      },
    });

    expect(result.isValid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('does not apply action-tool name restrictions to MCP tools', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        'mcp-tool-with-dash-and-long-name-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx': {
          type: 'McpClientTool',
          kind: 'Managed',
          inputs: {
            connectionReference: {
              connectionName: 'mcpConnection',
            },
            parameters: {
              mcpServerPath: '/servers/github',
            },
          },
        },
      },
    });

    expect(result.isValid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('fails MCP tool when required metadata is missing', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        MissingMcpMetadata: {
          type: 'McpClientTool',
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.MCP_TOOL_KIND_INVALID)).toBe(true);
    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.MCP_TOOL_INPUTS_INVALID)).toBe(true);
  });

  it('skips MCP-specific metadata validation outside agent workflows', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'stateful',
      tools: {
        MissingMcpMetadataNonAgent: {
          type: 'McpClientTool',
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.MCP_TOOL_KIND_INVALID)).toBe(false);
    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.MCP_TOOL_INPUTS_INVALID)).toBe(false);
  });

  it('fails managed MCP server path traversal and built-in path usage', () => {
    const managedTraversalResult = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        ManagedMcp: {
          type: 'McpClientTool',
          kind: 'Managed',
          inputs: {
            connectionReference: {
              connectionName: 'conn',
            },
            parameters: {
              mcpServerPath: '/servers/%2E%2E/secrets',
            },
          },
        },
      },
    });
    expect(
      managedTraversalResult.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.MCP_TOOL_SERVER_PATH_INVALID)
    ).toBe(true);

    const builtInPathResult = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        BuiltInMcp: {
          type: 'McpClientTool',
          kind: 'BuiltIn',
          inputs: {
            connectionReference: {
              connectionName: 'conn',
            },
            parameters: {
              mcpServerPath: '/servers/disallowed',
            },
          },
        },
      },
    });
    expect(
      builtInPathResult.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.MCP_TOOL_SERVER_PATH_NOT_SUPPORTED)
    ).toBe(true);
  });

  it('fails MCP allowedTools when null entries are present', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        McpAllowedTools: {
          type: 'McpClientTool',
          kind: 'Managed',
          inputs: {
            connectionReference: {
              connectionName: 'conn',
            },
            parameters: {
              mcpServerPath: '/servers/github',
              allowedTools: ['issues.list', null],
            },
          },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.MCP_TOOL_ALLOWED_TOOLS_INVALID)).toBe(true);
  });

  it('allows MCP allowedTools when explicitly null', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        McpAllowedToolsNull: {
          type: 'McpClientTool',
          kind: 'Managed',
          inputs: {
            connectionReference: {
              connectionName: 'conn',
            },
            parameters: {
              mcpServerPath: '/servers/github',
              allowedTools: null,
            },
          },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.MCP_TOOL_ALLOWED_TOOLS_INVALID)).toBe(false);
  });

  it('fails MCP tool when only connectionReferenceName is provided', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        McpConnectionReferenceAliasOnly: {
          type: 'McpClientTool',
          kind: 'Managed',
          inputs: {
            connectionReference: {
              connectionReferenceName: 'conn',
            },
            parameters: {
              mcpServerPath: '/servers/github',
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.MCP_TOOL_CONNECTION_REFERENCE_NAME_REQUIRED)
    ).toBe(true);
  });

  it('accepts whitespace-only MCP connection names to mirror runtime IsNullOrEmpty semantics', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        WhitespaceConnectionNameMcpTool: {
          type: 'McpClientTool',
          kind: 'Managed',
          inputs: {
            connectionReference: {
              connectionName: '   ',
            },
            parameters: {
              mcpServerPath: '/servers/github',
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.MCP_TOOL_CONNECTION_REFERENCE_NAME_REQUIRED)
    ).toBe(false);
  });

  it('allows a property literally named "pattern" and blocks schema regex keywords', () => {
    const namedPatternResult = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        PropertyNamePatternTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });
    expect(
      namedPatternResult.violations.some(
        (violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PATTERN_NOT_ALLOWED
      )
    ).toBe(false);

    const patternKeywordResult = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        PatternKeywordTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            patternProperties: {
              '^prefix_': {
                type: 'string',
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });
    expect(
      patternKeywordResult.violations.some(
        (violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PATTERN_NOT_ALLOWED
      )
    ).toBe(true);

    const emptyPatternPropertiesResult = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        EmptyPatternPropertiesTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            patternProperties: {},
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });
    expect(
      emptyPatternPropertiesResult.violations.some(
        (violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PATTERN_NOT_ALLOWED
      )
    ).toBe(false);
  });

  it('fails required schema references even when properties are absent', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        RequiredSchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            required: ['missing'],
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_REQUIRED_INVALID)).toBe(
      true
    );
  });

  it('treats falsy non-null schemas as invalid', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        FalsySchemaTool: {
          description: 'schema',
          agentParameterSchema: false,
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_ROOT_OBJECT_REQUIRED)
    ).toBe(true);
  });

  it('fails malformed schema property type declarations', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        InvalidTypeSchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              bad: {
                type: 42,
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID)
    ).toBe(true);
  });

  it('rejects duplicate object-only type arrays after normalization', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        DuplicateObjectTypeSchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              payload: {
                type: ['object', 'object'],
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID)
    ).toBe(true);
  });

  it('rejects object-typed properties resolved through local $ref', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        RefSchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            definitions: {
              objectPayload: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                },
              },
            },
            properties: {
              payload: {
                $ref: '#/definitions/objectPayload',
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID)
    ).toBe(true);
  });

  it('rejects unresolved and chained local $ref schemas that resolve to invalid object properties', () => {
    const unresolvedRefResult = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        MissingRefSchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              payload: {
                $ref: '#/definitions/missingType',
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });
    expect(
      unresolvedRefResult.violations.some(
        (violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID
      )
    ).toBe(true);

    const chainedRefResult = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        ChainedRefSchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            definitions: {
              objectPayload: {
                type: 'object',
              },
              aliasPayload: {
                $ref: '#/definitions/objectPayload',
              },
            },
            properties: {
              payload: {
                $ref: '#/definitions/aliasPayload',
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });
    expect(
      chainedRefResult.violations.some(
        (violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID
      )
    ).toBe(true);
  });

  it('fails malformed nested schema keyword values', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        InvalidNestedSchemaKeywordTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              payload: {
                type: 'array',
                items: 42,
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID)
    ).toBe(true);
  });

  it('fails malformed root and nested schema keyword structures', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        RootMalformedSchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            allOf: 42,
            properties: {
              payload: {
                type: 'array',
                items: {
                  type: 'object',
                  required: 42,
                },
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID)
    ).toBe(true);
  });

  it('fails malformed schema declarations for unknown types, invalid properties shape, and required non-strings', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        InvalidSchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: 'bad',
            required: [42],
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
        InvalidTypeTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              badType: {
                type: 'banana',
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_NULL)).toBe(
      true
    );
    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_REQUIRED_INVALID)).toBe(
      true
    );
    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID)
    ).toBe(true);
  });

  it('rejects required entries inherited from Object.prototype', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        InheritedRequiredSchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            required: ['toString'],
            properties: {},
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_REQUIRED_INVALID)).toBe(
      true
    );
  });

  it('accepts nullable schema property types to match runtime behavior', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        NullableSchemaTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              optionalString: {
                type: ['string', 'null'],
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID)
    ).toBe(false);
  });

  it('does not enforce agent-only handoff workflow restrictions on non-agent workflows', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'stateful',
      tools: {
        HandoffTool: {
          description: 'handoff',
          actions: {
            Transfer: {
              type: 'AgentHandOff',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((candidate) => candidate.ruleId === AgentToolPolicyRuleId.TOOL_HANDOFF_NOT_ALLOWED_FOR_WORKFLOW_KIND)
    ).toBe(false);
  });

  it('enforces agent-workflow action allowlist intersection from runtime validation', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        WaitTool: {
          description: 'wait',
          actions: {
            A: {
              type: 'Wait',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.ACTION_TYPE_NOT_ALLOWED_FOR_WORKFLOW_KIND)
    ).toBe(true);
  });

  it('does not apply the agent-only action allowlist to agentic workflows', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agentic',
      tools: {
        AgenticWaitTool: {
          description: 'wait',
          actions: {
            A: {
              type: 'Wait',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.ACTION_TYPE_NOT_ALLOWED_FOR_WORKFLOW_KIND)
    ).toBe(false);
  });

  it('keeps NestedAgent supported in non-agent workflows', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'stateful',
      tools: {
        StatefulNestedTool: {
          description: 'nested',
          actions: {
            A: {
              type: 'NestedAgent',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.ACTION_TYPE_NOT_SUPPORTED)).toBe(false);
    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.ACTION_TYPE_NOT_ALLOWED_FOR_WORKFLOW_KIND)
    ).toBe(false);
  });

  it('treats runAfter predecessors case-insensitively', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        CaseInsensitiveTool: {
          description: 'chain',
          actions: {
            StepA: {
              type: 'Compose',
              runAfter: {},
            },
            StepB: {
              type: 'Compose',
              runAfter: {
                stepa: ['Succeeded'],
              },
            },
          },
        },
      },
    });

    expect(result.isValid).toBe(true);
  });

  it('detects cycles even when runAfter predecessor casing differs', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        CaseCycleTool: {
          description: 'cycle',
          actions: {
            StepA: {
              type: 'Compose',
              runAfter: {
                stepb: ['Succeeded'],
              },
            },
            StepB: {
              type: 'Compose',
              runAfter: {
                STEPa: ['Succeeded'],
              },
            },
          },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_GRAPH_CYCLE_DETECTED)).toBe(true);
  });

  it('does not flatten stray tools attached to NestedAgent actions into parent tool topology', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        NestedAgentToolShape: {
          description: 'topology',
          actions: {
            Root: {
              type: 'NestedAgent',
              runAfter: {},
              tools: {
                InnerTool: {
                  type: 'FlowTemplateActionTool',
                  actions: {
                    InnerAction: {
                      type: 'Compose',
                      runAfter: {},
                    },
                  },
                },
              },
            } as unknown as any,
          },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_GRAPH_DISCONNECTED)).toBe(false);
    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_START_NODE_COUNT_INVALID)).toBe(false);
  });

  it('rejects empty and duplicate runAfter status arrays', () => {
    const emptyStatuses = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        EmptyStatusTool: {
          description: 'status',
          actions: {
            A: { type: 'Compose', runAfter: {} },
            B: { type: 'Compose', runAfter: { A: [] } },
          },
        },
      },
    });
    expect(
      emptyStatuses.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_RUN_AFTER_STATUS_NOT_SUPPORTED)
    ).toBe(true);

    const duplicateStatuses = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        DuplicateStatusTool: {
          description: 'status',
          actions: {
            A: { type: 'Compose', runAfter: {} },
            B: { type: 'Compose', runAfter: { A: ['Succeeded', 'Succeeded'] } },
          },
        },
      },
    });
    expect(
      duplicateStatuses.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_RUN_AFTER_STATUS_NOT_SUPPORTED)
    ).toBe(true);

    const nullStatuses = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        NullStatusTool: {
          description: 'status',
          actions: {
            A: { type: 'Compose', runAfter: {} },
            B: { type: 'Compose', runAfter: { A: null as unknown as string[] } },
          },
        },
      },
    });
    expect(
      nullStatuses.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_RUN_AFTER_STATUS_NOT_SUPPORTED)
    ).toBe(true);
  });

  it('ignores regex-like keys inside annotation payloads and still validates schema keywords', () => {
    const annotationPayloadResult = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        AnnotationPayloadTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              sample: {
                type: 'string',
                default: {
                  pattern: 'literal-data-key',
                },
              },
            },
          },
          actions: {
            A: { type: 'Compose', runAfter: {} },
          },
        },
      },
    });
    expect(
      annotationPayloadResult.violations.some(
        (violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PATTERN_NOT_ALLOWED
      )
    ).toBe(false);
  });

  it('detects schema pattern keywords under a property literally named "properties"', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        SchemaKeywordNameCollision: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              properties: {
                type: 'string',
                pattern: '^[a-z]+$',
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PATTERN_NOT_ALLOWED)
    ).toBe(true);
  });

  it('does not treat a property named "type" as a schema type keyword', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        TypePropertyNameCollision: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              payload: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID)
    ).toBe(false);
  });

  it('rejects malformed nested schema type declarations', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        NestedSchemaTypeTool: {
          description: 'schema',
          agentParameterSchema: {
            type: 'object',
            properties: {
              payload: {
                type: 'array',
                items: {
                  type: 'banana',
                },
              },
            },
          },
          actions: {
            A: {
              type: 'Compose',
              runAfter: {},
            },
          },
        },
      },
    });

    expect(
      result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_PARAMETER_SCHEMA_PROPERTY_TYPE_INVALID)
    ).toBe(true);
  });

  it('enforces terminal handoff even when predecessor casing differs', () => {
    const result = validateAgentToolPolicy({
      workflowKind: 'agent',
      tools: {
        HandoffCaseTool: {
          description: 'handoff',
          actions: {
            Transfer: {
              type: 'AgentHandOff',
              runAfter: {},
            },
            Followup: {
              type: 'Compose',
              runAfter: {
                transfer: ['Succeeded'],
              },
            },
          },
        },
      },
    });

    expect(result.violations.some((violation) => violation.ruleId === AgentToolPolicyRuleId.TOOL_HANDOFF_MUST_BE_TERMINAL)).toBe(true);
  });
});
