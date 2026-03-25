import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';
import { getSerializedWorkflowFromState } from './utils/designerFunctions';

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

      // Regular tool should be preserved
      expect(agent.tools.Regular_Tool).toBeDefined();
      expect(agent.tools.Regular_Tool.type).toBe('Tool');
      expect(agent.tools.Regular_Tool.actions).toBeDefined();
      expect(agent.tools.Regular_Tool.actions.Compose).toBeDefined();

      // Built-in MCP tool should be serialized with Connection block
      expect(agent.tools.BuiltIn_MCP_Server).toBeDefined();
      expect(agent.tools.BuiltIn_MCP_Server.type).toBe('McpClientTool');
      expect(agent.tools.BuiltIn_MCP_Server.kind).toBe('BuiltIn');
      expect(agent.tools.BuiltIn_MCP_Server.inputs).toBeDefined();
      expect(agent.tools.BuiltIn_MCP_Server.inputs.Connection).toBeDefined();
      expect(agent.tools.BuiltIn_MCP_Server.inputs.Connection.McpServerUrl).toBe('https://mcp.time.mcpcentral.io/');
      expect(agent.tools.BuiltIn_MCP_Server.inputs.Connection.Authentication).toBe('None');

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
  }
);
