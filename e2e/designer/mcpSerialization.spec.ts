import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';
import { getConnectionReferencesFromState, getSerializedWorkflowFromState } from './utils/designerFunctions';

test.describe(
  'MCP Serialization Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should serialize an Agent workflow with MCP tools (built-in and managed) and match', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Agent with MCP Tools');

      const serialized: any = await getSerializedWorkflowFromState(page);

      // Verify top-level structure
      expect(serialized.definition).toBeDefined();
      expect(serialized.definition.actions).toBeDefined();
      expect(serialized.definition.actions.WorkflowAgent).toBeDefined();

      const agent = serialized.definition.actions.WorkflowAgent;

      // Agent should be of type Agent
      expect(agent.type).toBe('Agent');

      // Agent should have tools
      expect(agent.tools).toBeDefined();

      // Regular tool should be preserved (note: type is not round-tripped for subgraph tools)
      expect(agent.tools.Regular_Tool).toBeDefined();
      expect(agent.tools.Regular_Tool.actions).toBeDefined();
      expect(agent.tools.Regular_Tool.actions.Compose).toBeDefined();

      // Built-in MCP tool on Standard should serialize as a connectionReference pointing to
      // agentMcpConnections. Inline `Connection` is a Consumption-only shape (see serializeBuiltInMcpOperation).
      expect(agent.tools.BuiltIn_MCP_Server).toBeDefined();
      expect(agent.tools.BuiltIn_MCP_Server.type).toBe('McpClientTool');
      expect(agent.tools.BuiltIn_MCP_Server.kind).toBe('BuiltIn');
      expect(agent.tools.BuiltIn_MCP_Server.inputs).toBeDefined();
      expect(agent.tools.BuiltIn_MCP_Server.inputs.connectionReference).toBeDefined();
      expect(agent.tools.BuiltIn_MCP_Server.inputs.connectionReference.connectionName).toBe('mcpclient');
      expect(agent.tools.BuiltIn_MCP_Server.inputs.Connection).toBeUndefined();

      // Managed MCP tool should be serialized with connectionReference
      expect(agent.tools.Managed_MCP_Server).toBeDefined();
      expect(agent.tools.Managed_MCP_Server.type).toBe('McpClientTool');
      expect(agent.tools.Managed_MCP_Server.kind).toBe('Managed');
      expect(agent.tools.Managed_MCP_Server.inputs).toBeDefined();
      expect(agent.tools.Managed_MCP_Server.inputs.connectionReference).toBeDefined();
    });

    test('Should not include built-in MCP connections in connectionReferences', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Agent with MCP Tools');

      const serialized: any = await getSerializedWorkflowFromState(page);

      // connectionReferences should not contain built-in MCP connection paths
      const refs = serialized.connectionReferences ?? {};
      for (const [, ref] of Object.entries(refs) as [string, any][]) {
        // No reference should point to a built-in MCP connection
        expect(ref.connection?.id?.includes('/connectionProviders/mcpclient/connections/')).not.toBe(true);
      }
    });

    test('Should preserve all three tool types in the Agent after round-trip', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Agent with MCP Tools');

      const serialized: any = await getSerializedWorkflowFromState(page);
      const toolKeys = Object.keys(serialized.definition.actions.WorkflowAgent.tools ?? {});

      // Should have all 3 tools: Regular_Tool, BuiltIn_MCP_Server, Managed_MCP_Server
      expect(toolKeys).toContain('Regular_Tool');
      expect(toolKeys).toContain('BuiltIn_MCP_Server');
      expect(toolKeys).toContain('Managed_MCP_Server');
      expect(toolKeys.length).toBe(3);
    });

    test('Should surface UAMI identity on a managed MCP connection loaded from $connections.value', async ({ page }) => {
      // The connectionReferences rebuild from $connections.value lives in the designer-v2 deserializer.
      await page.goto('/v2');

      await GoToMockWorkflow(page, 'Agent with MCP UAMI');

      // Consumption workflows store connections in parameters.$connections.value. The deserializer
      // rebuilds connectionReferences from that, preserving connectionProperties so the UAMI surfaces on load.
      await page.waitForFunction(() => {
        const state = (window as any).DesignerStoreV2?.getState?.();
        return !!state?.connections?.connectionReferences?.mcp;
      });

      const references: any = await getConnectionReferencesFromState(page);

      const mcpRef = references?.mcp;
      expect(mcpRef).toBeDefined();
      expect(mcpRef.connectionProperties?.authentication?.type).toBe('ManagedServiceIdentity');
      expect(mcpRef.connectionProperties?.authentication?.identity).toBe(
        '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/test-uami'
      );
    });
  }
);
