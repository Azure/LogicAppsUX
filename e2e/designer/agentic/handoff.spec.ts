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

// `addAgentHandoff` adds the tool and edge synchronously but populates the handoff action's `inputs`
// from an unawaited `initializeOperationDetails`, so the tool key shows up in the serialized workflow
// before its payload does. Always poll this whole shape rather than the tool names alone, otherwise
// assertions on the payload race initialization.
const getHandoffToolShape = async (page: Page, agentId: string, toolId: string) => {
  const tool = (await getAgentTools(page, agentId))[toolId];
  if (!tool) {
    return null;
  }
  const actionIds = Object.keys(tool.actions ?? {});
  const action = actionIds.length === 1 ? tool.actions[actionIds[0]] : undefined;
  return {
    description: tool.description,
    actionCount: actionIds.length,
    actionIdIsGenerated: actionIds.length === 1 ? /^handoff_[a-z0-9]{8}$/i.test(actionIds[0]) : false,
    // Handoffs created at runtime currently serialize as `AgentHandOff` while ones read from a
    // definition round-trip as `AgentHandoff`, so compare case-insensitively.
    type: typeof action?.type === 'string' ? action.type.toLowerCase() : action?.type,
    inputs: action?.inputs,
  };
};

const fixtureHandoffs = [
  {
    agentId: 'TriageAgent',
    toolId: 'handoff_from_TriageAgent_to_SalesAgent_tool',
    actionId: 'handoff_from_TriageAgent_to_SalesAgent',
    target: 'SalesAgent',
    description: 'Hand off to sales agent who can fulfill sales requests such as ordering a product.',
  },
  {
    agentId: 'TriageAgent',
    toolId: 'handoff_from_TriageAgent_to_RefundAgent_tool',
    actionId: 'handoff_from_TriageAgent_to_RefundAgent',
    target: 'RefundAgent',
    description: 'Hand off to refund agent who can fulfill refund requests.',
  },
  {
    agentId: 'SalesAgent',
    toolId: 'handoff_from_SalesAgent_to_TriageAgent_tool',
    actionId: 'handoff_from_SalesAgent_to_TriageAgent',
    target: 'TriageAgent',
    description: 'Hand off to triage agent who can check if there are any further help needed.',
  },
  {
    agentId: 'RefundAgent',
    toolId: 'handoff_from_RefundAgent_to_TriageAgent_tool',
    actionId: 'handoff_from_RefundAgent_to_TriageAgent',
    target: 'TriageAgent',
    description: 'Hand off to triage agent who can check if there are any further help needed.',
  },
  {
    agentId: 'RefundAgent',
    toolId: 'handoff_from_RefundAgent_to_SalesAgent_tool',
    actionId: 'handoff_from_RefundAgent_to_SalesAgent',
    target: 'SalesAgent',
    description: 'Hand off to sales agent who can fulfill refund requests.',
  },
];

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
      // A handoff tool and a regular tool coexist on the same agent without either being dropped.
      expect(await getAgentToolNames(page, 'SalesAgent')).toEqual(['handoff_from_SalesAgent_to_TriageAgent_tool', 'place_order']);
      expect(await getAgentToolNames(page, 'RefundAgent')).toEqual([
        'handoff_from_RefundAgent_to_SalesAgent_tool',
        'handoff_from_RefundAgent_to_TriageAgent_tool',
      ]);

      // Every fixture handoff keeps its description and its inner AgentHandoff action, id, and target.
      for (const handoff of fixtureHandoffs) {
        const tool = (await getAgentTools(page, handoff.agentId))[handoff.toolId];
        expect(tool.description, `description of ${handoff.toolId}`).toBe(handoff.description);
        expect(Object.keys(tool.actions), `actions of ${handoff.toolId}`).toEqual([handoff.actionId]);
        expect(tool.actions[handoff.actionId].type, `type of ${handoff.actionId}`).toMatch(/^AgentHandoff$/i);
        expect(tool.actions[handoff.actionId].inputs, `inputs of ${handoff.actionId}`).toEqual({ name: handoff.target });
      }

      // The non-handoff tool on SalesAgent round-trips untouched alongside the handoff tools.
      const placeOrder = (await getAgentTools(page, 'SalesAgent')).place_order;
      expect(placeOrder.description).toBe('Place the order');
      expect(Object.keys(placeOrder.actions)).toEqual([
        'set_order_parameters',
        'resetset_state_variable_from_sales_to_triage',
        'complete_order',
      ]);
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

      // generateHandoffToolName() names the tool `handoff_to_<target>_from_<source>`, and the inner
      // action gets a generated `handoff_<guid>` id whose only input is the target agent name. Poll
      // the whole payload, since `inputs` is filled in asynchronously after the tool itself appears.
      await expect
        .poll(() => getHandoffToolShape(page, 'SalesAgent', 'handoff_to_RefundAgent_from_SalesAgent'))
        .toEqual({
          description: '',
          actionCount: 1,
          actionIdIsGenerated: true,
          type: 'agenthandoff',
          inputs: { name: 'RefundAgent' },
        });

      expect(await getAgentToolNames(page, 'SalesAgent')).toEqual([
        'handoff_from_SalesAgent_to_TriageAgent_tool',
        'handoff_to_RefundAgent_from_SalesAgent',
        'place_order',
      ]);
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

    test('Unchecking an agents only handoff removes it', async ({ page }) => {
      await GoToMockWorkflowV2(page, 'Handoff A2A');

      // SalesAgent has exactly one handoff, so unchecking it drives `checkedItems` to zero — the
      // boundary the selector used to bail out of, which made the last handoff unremovable.
      await openHandoffTab(page, 'card-salesagent');
      await expect(handoffEntryHeader(page, 'TriageAgent')).toBeVisible();

      await toggleAgentInSelector(page, 'TriageAgent');

      await expect(agentEdge(page, 'SalesAgent', 'TriageAgent')).toHaveCount(0);
      await expect(handoffEntryHeader(page, 'TriageAgent')).toHaveCount(0);
      // The agent's non-handoff tool is left alone.
      await expect.poll(() => getAgentToolNames(page, 'SalesAgent')).toEqual(['place_order']);
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
