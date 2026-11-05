import { expect, test, type Page } from '@playwright/test';
import type { RootState } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow } from './utils/sharedNodeUi';

const selection = (page: Page) =>
  page.evaluate(
    () =>
      (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().panel.operationContent.selectedNodeIds
  );
const selectPair = async (page: Page) => {
  for (const [index, id] of ['Compose', 'Execute_a_navigation_plan'].entries()) {
    await page.locator(`[id="msla-node-${id}"]`).click(index === 0 ? {} : { modifiers: ['ControlOrMeta'] });
  }
  expect((await selection(page)).sort()).toEqual(['Compose', 'Execute_a_navigation_plan']);
};

for (const flag of ['true', 'false'] as const) {
  test.describe(`Remaining Local commands, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('cuts a real pair by keyboard and restores their complete definitions through Undo', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await selectPair(page);
      await page.locator('#msla-node-Compose').focus();
      await page.keyboard.press('ControlOrMeta+x');
      await expect
        .poll(async () => Object.keys((await getSerializedWorkflowFromStateV2(page)).definition.actions))
        .not.toContain('Compose');
      const after = await getSerializedWorkflowFromStateV2(page);
      expect(after.definition.actions.Execute_a_navigation_plan).toBeUndefined();
      const clipboard = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
      expect(clipboard.isMultiNode).toBe(true);
      expect(clipboard.nodes.map((node: { nodeId: string }) => node.nodeId).sort()).toEqual([
        'Compose-copy',
        'Execute_a_navigation_plan-copy',
      ]);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });

    test('pastes an actual pair and deletes only the selected copies through confirmation', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      for (const id of ['Compose', 'Execute_a_navigation_plan']) {
        await page.locator(`[id="msla-node-${id}"]`).press('Enter');
        const editor = page.locator('.editor-input[contenteditable="true"]').first();
        await editor.fill(`Local acceptance input for ${id}`);
        await editor.press('Tab');
        await expect
          .poll(async () => (await getSerializedWorkflowFromStateV2(page)).definition.actions[id].inputs)
          .toBe(`Local acceptance input for ${id}`);
        await page.getByTestId('msla-panel-header-close-nav').click();
      }
      const before = await getSerializedWorkflowFromStateV2(page);
      await selectPair(page);
      await page.locator('#msla-node-Compose').click({ button: 'right' });
      await page.getByTestId('msla-bulk-copy-menu-option').click();
      await page.keyboard.press('Escape');
      const insert = page.getByRole('button', { name: 'Insert a new step between Init all and Compose', exact: true });
      await insert.focus();
      await insert.press('Enter');
      await page.getByTestId('msla-paste-button-init_all-compose').click();
      await expect
        .poll(async () => Object.keys((await getSerializedWorkflowFromStateV2(page)).definition.actions).length)
        .toBe(Object.keys(before.definition.actions).length + 2);
      const pasted = await getSerializedWorkflowFromStateV2(page);
      const newIds = Object.keys(pasted.definition.actions).filter((id) => !before.definition.actions[id]);
      expect(newIds.sort()).toEqual(['Compose-copy', 'Execute_a_navigation_plan-copy']);
      for (const id of newIds) {
        const source = before.definition.actions[id.replace(/-copy$/, '')];
        expect(pasted.definition.actions[id].type).toBe(source.type);
        expect(pasted.definition.actions[id].inputs).toEqual(source.inputs);
      }
      await page.getByTestId('msla-panel-header-close-nav').click();
      for (const [index, id] of newIds.entries()) {
        await page.locator(`[id="msla-node-${id}"]`).click(index === 0 ? {} : { modifiers: ['ControlOrMeta'] });
      }
      expect((await selection(page)).sort()).toEqual(newIds.sort());
      await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).focus();
      expect((await selection(page)).sort()).toEqual(newIds.sort());
      await page.keyboard.press('Delete');
      const confirmation = page.getByRole('dialog', { name: 'Delete workflow actions', exact: true });
      await expect(confirmation).toBeVisible();
      await expect(confirmation.getByText('Are you sure you want to delete these 2 actions?', { exact: true })).toBeVisible();
      await confirmation.getByRole('button', { name: 'Delete', exact: true }).click();
      for (const id of newIds) {
        await expect(page.locator(`[id="msla-node-${id}"]`)).toHaveCount(0);
      }
      expect(Object.keys((await getSerializedWorkflowFromStateV2(page)).definition.actions).sort()).toEqual(
        Object.keys(before.definition.actions).sort()
      );
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(pasted.definition.actions);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      const partial = await getSerializedWorkflowFromStateV2(page);
      expect(Object.keys(partial.definition.actions).filter((id) => !before.definition.actions[id])).toEqual([
        'Execute_a_navigation_plan-copy',
      ]);
      expect(partial.definition.actions['Execute_a_navigation_plan-copy'].inputs).toEqual(
        before.definition.actions.Execute_a_navigation_plan.inputs
      );
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });

    test('selects all actual operations and pans without changing workflow content', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const ids = await page.evaluate(() =>
        Object.keys((window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().workflow.operations)
      );
      await page.locator('#msla-node-Compose').focus();
      await page.keyboard.press('ControlOrMeta+a');
      await expect.poll(async () => (await selection(page)).slice().sort()).toEqual(ids.sort());
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      const viewport = page.locator('.react-flow__viewport');
      const beforePan = await viewport.getAttribute('style');
      const pane = await page.locator('.react-flow__pane').boundingBox();
      if (!pane) {
        throw new Error('The actual workflow pane must be visible for native panning.');
      }
      await page.mouse.move(pane.x + 120, pane.y + 120);
      await page.mouse.down();
      await page.mouse.move(pane.x + 180, pane.y + 160, { steps: 8 });
      await page.mouse.up();
      await expect(viewport).not.toHaveAttribute('style', beforePan ?? '');
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });

    for (const parallel of [false, true]) {
      test(`creates an uncopied ${parallel ? 'parallel branch' : 'sequential action'} through the real discovery picker`, async ({
        page,
      }) => {
        await openSharedWorkflow(page, 'General Run After', flag);
        const before = await getSerializedWorkflowFromStateV2(page);
        const insert = page.getByRole('button', { name: 'Insert a new step between Init all and Compose', exact: true });
        await insert.focus();
        await insert.press('Enter');
        await page.getByRole('menuitem', { name: parallel ? 'Add a parallel branch' : 'Add an action', exact: true }).click();
        await page.getByRole('searchbox', { name: 'Search for an action', exact: true }).fill('scope');
        await page.getByLabel('Scope', { exact: true }).click();
        await expect
          .poll(async () => Object.keys((await getSerializedWorkflowFromStateV2(page)).definition.actions).length)
          .toBe(Object.keys(before.definition.actions).length + 1);
        const after = await getSerializedWorkflowFromStateV2(page);
        const created = Object.keys(after.definition.actions).find((id) => !before.definition.actions[id]);
        if (!created) {
          throw new Error('Discovery must create an actual new operation.');
        }
        expect(after.definition.actions[created].type).toBe('Scope');
        expect(after.definition.actions[created].runAfter).toEqual(before.definition.actions.Compose.runAfter);
        expect(after.definition.actions.Compose.runAfter).toEqual(
          parallel ? before.definition.actions.Compose.runAfter : { [created]: ['SUCCEEDED'] }
        );
        await page.getByRole('button', { name: 'Undo', exact: true }).click();
        expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      });
    }

    test('opens the actual empty-trigger picker using Space', async ({ page }) => {
      await openSharedWorkflow(page, 'Empty/New', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const placeholder = page.getByRole('button', {
        name: flag === 'true' ? 'Add a trigger to start your workflow' : 'Add trigger',
        exact: true,
      });
      await placeholder.focus();
      await placeholder.press('Space');
      await expect(page.getByRole('heading', { name: /Add a trigger/i })).toBeVisible();
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    });
  });
}
