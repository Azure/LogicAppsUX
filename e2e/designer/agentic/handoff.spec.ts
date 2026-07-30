import { expect, test, type Locator, type Page } from '@playwright/test';
import { GoToMockWorkflowV2 } from '../utils/GoToWorkflow';
import { getSerializedWorkflowFromStateV2 } from '../utils/designerFunctions';

// Handoffs are the agent-to-agent control transfer mechanism in agentic workflows. Each handoff is
// stored as a tool subgraph on the source agent whose only action is an `AgentHandoff` pointing at the
// target agent, and the designer renders it as a direct agent-to-agent edge rather than a tool node.
// The add/remove thunks live in libs/designer-v2/src/lib/core/actions/bjsworkflow/handoff.ts and the UI
// in libs/designer-v2/src/lib/ui/panel/nodeDetailsPanel/tabs/handoffTab.

const agentEdge = (page: Page, sourceId: string, targetId: string): Locator =>
  page.locator(`[data-testid="rf__edge-${sourceId}-${targetId}"]`);

const handoffEntryHeader = (page: Page, targetAgentName: string): Locator =>
  page.getByRole('button', { name: targetAgentName, exact: true });

const deleteHandoffButton = (page: Page, targetAgentName: string): Locator =>
  handoffEntryHeader(page, targetAgentName).locator('xpath=following-sibling::button[@aria-label="Delete handoff"]');

const openHandoffTab = async (page: Page, agentCardTestId: string) => {
  // Close any panel that is already open so the canvas returns to full width, then re-fit. Adding or
  // removing a handoff re-layouts the graph, and a node can end up underneath the Standalone toolbox
  // nub, which would swallow the click.
  const closePanelButton = page.getByRole('button', { name: 'Close', exact: true });
  if ((await closePanelButton.count()) > 0) {
    await closePanelButton.first().click();
  }
  await page.getByLabel('Zoom view to fit').click({ force: true });

  await page.getByTestId(agentCardTestId).click();
  await page.getByRole('tab', { name: 'Handoffs' }).click();
  await expect(page.getByRole('button', { name: 'Select agents' })).toBeVisible();
};

const toggleAgentInSelector = async (page: Page, targetAgentName: string) => {
  await page.getByRole('button', { name: 'Select agents' }).click();
  await page.getByRole('menuitemcheckbox', { name: targetAgentName, exact: true }).click();
  await page.keyboard.press('Escape');
};

const getAgentTools = async (page: Page, agentId: string): Promise<Record<string, any>> => {
  const serialized: any = await getSerializedWorkflowFromStateV2(page);
  return serialized.definition.actions[agentId].tools ?? {};
};

const getAgentToolNames = async (page: Page, agentId: string): Promise<string[]> => {
  return Object.keys(await getAgentTools(page, agentId)).sort();
};

test.describe(
  'Agent handoff tests',
  {
    tag: '@mock',
  },
  () => {
    test('Handoff tools deserialize into agent-to-agent edges and survive a serialization round-trip', async ({ page }) => {
      await GoToMockWorkflowV2(page, 'Handoff A2A');

      // Every handoff in the fixture becomes a direct edge between the two agents. Bidirectional pairs
      // are drawn as a single overlapping spline, so assert the edge exists in the graph rather than
      // that each direction paints its own visible line.
      await expect(agentEdge(page, 'TriageAgent', 'SalesAgent')).toBeAttached();
      await expect(agentEdge(page, 'TriageAgent', 'RefundAgent')).toBeAttached();
      await expect(agentEdge(page, 'SalesAgent', 'TriageAgent')).toBeAttached();
      await expect(agentEdge(page, 'RefundAgent', 'TriageAgent')).toBeAttached();
      await expect(agentEdge(page, 'RefundAgent', 'SalesAgent')).toBeAttached();

      // Handoff tools are folded into those edges, so they must not surface as tool nodes on the
      // canvas. A non-handoff tool on the same agent (`place_order`) still does.
      await expect(page.locator('[data-testid="rf__node-place_order"]')).toBeVisible();
      await expect(page.locator('[data-testid^="rf__node-handoff_"]')).toHaveCount(0);

      const triageTools = await getAgentTools(page, 'TriageAgent');
      expect(Object.keys(triageTools).sort()).toEqual([
        'handoff_from_TriageAgent_to_RefundAgent_tool',
        'handoff_from_TriageAgent_to_SalesAgent_tool',
      ]);

      // The tool description and the inner AgentHandoff action (including its target) round-trip.
      const toSales = triageTools.handoff_from_TriageAgent_to_SalesAgent_tool;
      expect(toSales.description).toBe('Hand off to sales agent who can fulfill sales requests such as ordering a product.');
      expect(toSales.actions.handoff_from_TriageAgent_to_SalesAgent.type).toMatch(/^AgentHandoff$/i);
      expect(toSales.actions.handoff_from_TriageAgent_to_SalesAgent.inputs).toEqual({ name: 'SalesAgent' });

      const toRefund = triageTools.handoff_from_TriageAgent_to_RefundAgent_tool;
      expect(toRefund.description).toBe('Hand off to refund agent who can fulfill refund requests.');
      expect(toRefund.actions.handoff_from_TriageAgent_to_RefundAgent.inputs).toEqual({ name: 'RefundAgent' });

      // A handoff tool and a regular tool coexist on the same agent without either being dropped.
      expect(await getAgentToolNames(page, 'SalesAgent')).toEqual(['handoff_from_SalesAgent_to_TriageAgent_tool', 'place_order']);
    });

    test('Selecting an agent in the handoff selector adds a handoff tool, edge, and tab entry', async ({ page }) => {
      await GoToMockWorkflowV2(page, 'Handoff A2A');

      await openHandoffTab(page, 'card-salesagent');
      await expect(agentEdge(page, 'SalesAgent', 'RefundAgent')).toHaveCount(0);

      await toggleAgentInSelector(page, 'RefundAgent');

      // The new handoff shows up on the canvas and in the Handoffs tab.
      await expect(agentEdge(page, 'SalesAgent', 'RefundAgent')).toBeAttached();
      await expect(handoffEntryHeader(page, 'RefundAgent')).toBeVisible();
      await expect(handoffEntryHeader(page, 'TriageAgent')).toBeVisible();

      await expect
        .poll(() => getAgentToolNames(page, 'SalesAgent'))
        .toEqual(['handoff_from_SalesAgent_to_TriageAgent_tool', 'handoff_to_RefundAgent_from_SalesAgent', 'place_order']);

      // generateHandoffToolName() names the tool `handoff_to_<target>_from_<source>`, and the inner
      // action gets a generated `handoff_<guid>` id whose only input is the target agent name.
      const tools = await getAgentTools(page, 'SalesAgent');
      const added = tools.handoff_to_RefundAgent_from_SalesAgent;
      const addedActionIds = Object.keys(added.actions);
      expect(addedActionIds).toHaveLength(1);
      expect(addedActionIds[0]).toMatch(/^handoff_[a-z0-9]{8}$/i);
      expect(added.actions[addedActionIds[0]].type).toMatch(/^AgentHandoff$/i);
      expect(added.actions[addedActionIds[0]].inputs).toEqual({ name: 'RefundAgent' });
    });

    test('Deleting a handoff entry removes its tool and edge while leaving other tools intact', async ({ page }) => {
      await GoToMockWorkflowV2(page, 'Handoff A2A');

      await openHandoffTab(page, 'card-refundagent');
      await expect(agentEdge(page, 'RefundAgent', 'SalesAgent')).toBeAttached();

      await deleteHandoffButton(page, 'SalesAgent').click();

      await expect(agentEdge(page, 'RefundAgent', 'SalesAgent')).toHaveCount(0);
      await expect(handoffEntryHeader(page, 'SalesAgent')).toHaveCount(0);
      // The agent's other handoff is untouched.
      await expect(handoffEntryHeader(page, 'TriageAgent')).toBeVisible();
      await expect(agentEdge(page, 'RefundAgent', 'TriageAgent')).toBeAttached();

      await expect.poll(() => getAgentToolNames(page, 'RefundAgent')).toEqual(['handoff_from_RefundAgent_to_TriageAgent_tool']);
      // Deleting a handoff on one agent must not touch tools on another agent.
      expect(await getAgentToolNames(page, 'SalesAgent')).toEqual(['handoff_from_SalesAgent_to_TriageAgent_tool', 'place_order']);
    });

    test('Unchecking an agent in the selector removes the handoff and flags the target as unreachable', async ({ page }) => {
      await GoToMockWorkflowV2(page, 'Handoff A2A');

      // RefundAgent is only reachable through TriageAgent's handoff, so removing it strands the agent.
      await openHandoffTab(page, 'card-triageagent');
      await toggleAgentInSelector(page, 'RefundAgent');

      await expect(agentEdge(page, 'TriageAgent', 'RefundAgent')).toHaveCount(0);
      await expect(handoffEntryHeader(page, 'RefundAgent')).toHaveCount(0);
      await expect.poll(() => getAgentToolNames(page, 'TriageAgent')).toEqual(['handoff_from_TriageAgent_to_SalesAgent_tool']);

      await openHandoffTab(page, 'card-refundagent');
      await expect(page.getByText('Agent is unreachable in flow structure')).toBeVisible();

      // SalesAgent still has an inbound handoff from TriageAgent, so it is not flagged.
      await openHandoffTab(page, 'card-salesagent');
      await expect(page.getByText('Agent is unreachable in flow structure')).toHaveCount(0);
    });

    test('Editing a handoff description serializes onto the handoff tool', async ({ page }) => {
      await GoToMockWorkflowV2(page, 'Handoff A2A');

      await openHandoffTab(page, 'card-salesagent');

      const description = page.locator('#handoff_from_SalesAgent_to_TriageAgent_tool-description');
      await expect(description).toHaveValue('Hand off to triage agent who can check if there are any further help needed.');

      await description.fill('Hand back to triage once the sale is complete.');
      await description.blur();

      await expect
        .poll(async () => (await getAgentTools(page, 'SalesAgent')).handoff_from_SalesAgent_to_TriageAgent_tool.description)
        .toBe('Hand back to triage once the sale is complete.');
    });
  }
);
