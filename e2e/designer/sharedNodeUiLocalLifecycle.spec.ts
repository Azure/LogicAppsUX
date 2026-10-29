import { expect, test } from '@playwright/test';
import type { AppStore } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow } from './utils/sharedNodeUi';

type DesignerWindow = Window & { DesignerStoreV2: Pick<AppStore, 'dispatch' | 'getState'> };

for (const flag of ['true', 'false'] as const) {
  test.describe(`Local lifecycle and mutations, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('recreates a removed handoff through the actual Agent selector', async ({ page }) => {
      await openSharedWorkflow(page, 'Basic A2A', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const handoffControl =
        flag === 'true'
          ? page.getByRole('button', { name: 'Edit handoff', exact: true })
          : page.locator('.react-flow__edgelabel-renderer button[style*="--colorBrandBackground:"]');
      await expect(handoffControl).toHaveCount(1);
      await handoffControl.press('Enter');
      await page.getByRole('menuitem', { name: 'Edit handoff', exact: true }).click();
      await expect(page.getByRole('tab', { name: 'Handoffs', exact: true })).toHaveAttribute('aria-selected', 'true');
      await page.getByRole('button', { name: 'Delete handoff', exact: true }).click();
      await expect(handoffControl).toHaveCount(0);
      await page.getByRole('button', { name: 'Select agents', exact: true }).click();
      await page.getByRole('menuitemcheckbox', { name: 'Another Agent', exact: true }).click();
      await page.keyboard.press('Escape');
      await expect(handoffControl).toHaveCount(1);
      const after = await getSerializedWorkflowFromStateV2(page);
      const tool = after.definition.actions.WorkflowAgent.tools.handoff_to_Another_Agent_from_WorkflowAgent;
      expect(tool).toBeDefined();
      expect(Object.values(tool.actions)).toEqual([{ type: 'AgentHandOff', inputs: { name: 'Another_Agent' } }]);
      expect(after.definition.actions.Another_Agent).toEqual(before.definition.actions.Another_Agent);
      for (const [id, original] of Object.entries(before.definition.actions.WorkflowAgent.tools)) {
        if (id !== 'handoff_from_WorkflowAgent_to_Another_Agent_tool') {
          expect(after.definition.actions.WorkflowAgent.tools[id]).toEqual(original);
        }
      }
    });

    test('renames through the actual panel while retaining graph identity and run-after references', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const card = page.locator('#msla-node-Init_all');
      await card.press('Enter');
      const title = page.getByRole('textbox', { name: 'Card title', exact: true });
      await title.fill('Renamed initialization');
      await title.press('Tab');
      await expect(card).toHaveAccessibleName(/Renamed initialization/);
      await expect(page.locator('#msla-node-Renamed_initialization')).toHaveCount(0);
      const after = await getSerializedWorkflowFromStateV2(page);
      expect(after.definition.actions.Renamed_initialization).toEqual(before.definition.actions.Init_all);
      expect(after.definition.actions.Init_all).toBeUndefined();
      expect(after.definition.actions.Compose.runAfter).toEqual({
        Renamed_initialization: before.definition.actions.Compose.runAfter.Init_all,
      });
      expect(after.definition.actions.Execute_a_navigation_plan.runAfter).toEqual({
        Renamed_initialization: before.definition.actions.Execute_a_navigation_plan.runAfter.Init_all,
      });
      await title.fill('Init all');
      await title.press('Tab');
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });

    test('renders and clears source-contract simulated secure, mock, error and runtime indicators', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'Scope', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const card = page.locator('#msla-node-Increment_variable_2');
      await page.evaluate(() => {
        const store = (window as DesignerWindow).DesignerStoreV2;
        store.dispatch({
          type: 'operationMetadata/updateNodeSettings',
          payload: { id: 'Increment_variable_2', settings: { secureInputs: { value: true } } },
        });
        store.dispatch({
          type: 'operationMetadata/updateStaticResults',
          payload: { id: 'Increment_variable_2', staticResults: { name: 'Local simulated result', staticResultOptions: 'Enabled' } },
        });
        store.dispatch({
          type: 'operationMetadata/updateErrorDetails',
          payload: { id: 'Increment_variable_2', errorInfo: { level: 4, message: 'Deterministic Local validation error' } },
        });
      });
      await expect(card.getByTestId('card-indicator-secure-inputs-outputs')).toBeVisible();
      await expect(card.getByTestId('card-indicator-static-results')).toBeVisible();
      await expect(card.getByRole('img', { name: 'Errors', exact: true })).toBeVisible();
      await page.evaluate(() => {
        (window as DesignerWindow).DesignerStoreV2.dispatch({
          type: 'workflow/setRepetitionRunData',
          payload: {
            nodeId: 'Increment_variable_2',
            runData: { status: 'Succeeded', startTime: '2026-01-01T00:00:00Z', endTime: '2026-01-01T00:00:01Z' },
          },
        });
      });
      await expect(card.getByRole('img', { name: 'Errors', exact: true })).toHaveCount(0);
      const status =
        flag === 'true' ? card.locator('[data-badge-status="succeeded"]') : card.getByRole('img', { name: 'Succeeded', exact: true });
      await expect(status).toBeVisible();
      await testInfo.attach('simulated-indicators', {
        body: JSON.stringify({ evidence: 'Reducer-backed component states, not observed backend or authenticated settings' }),
        contentType: 'application/json',
      });
      await page.evaluate(() => {
        const store = (window as DesignerWindow).DesignerStoreV2;
        store.dispatch({
          type: 'operationMetadata/updateNodeSettings',
          payload: { id: 'Increment_variable_2', settings: { secureInputs: { value: false } } },
        });
        store.dispatch({ type: 'operationMetadata/deleteStaticResult', payload: { id: 'Increment_variable_2' } });
        store.dispatch({ type: 'operationMetadata/updateErrorDetails', payload: { id: 'Increment_variable_2', clear: true } });
        store.dispatch({ type: 'workflow/clearAllRepetitionRunData' });
      });
      await expect(card.getByTestId('card-indicator-secure-inputs-outputs')).toHaveCount(0);
      await expect(card.getByTestId('card-indicator-static-results')).toHaveCount(0);
      await expect(card.getByRole('img', { name: 'Errors', exact: true })).toHaveCount(0);
      await expect(status).toHaveCount(0);
      const after = await getSerializedWorkflowFromStateV2(page);
      expect(after.definition.actions).toEqual(before.definition.actions);
    });
  });
}
