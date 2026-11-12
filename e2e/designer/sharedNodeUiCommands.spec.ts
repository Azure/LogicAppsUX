import { expect, test } from '@playwright/test';
import type { RootState } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { LoadRunFile } from './utils/GoToWorkflow';
import { dragOperationToInsertion, openSharedWorkflow, waitForViewport } from './utils/sharedNodeUi';

for (const flag of ['true', 'false'] as const) {
  test.describe(`Shared node UI structural and canvas commands, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('keeps trigger and scope context commands on their actual graph identities', async ({ page }) => {
      await openSharedWorkflow(page, 'Scope', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await page.locator('#msla-node-manual').click({ button: 'right' });
      await page.getByRole('menuitem', { name: /Copy trigger/ }).click();
      await expect(page.locator('#msla-node-manual')).toBeFocused();
      await expect
        .poll(async () => JSON.parse(await page.evaluate(() => navigator.clipboard.readText())))
        .toMatchObject({ nodeId: 'manual-copy', isScopeNode: false, nodeOperationInfo: { type: 'Request' } });
      await page.keyboard.press('Escape');
      const scope = page.locator('#msla-node-Scope');
      await scope.click({ button: 'right' });
      await page.getByRole('menuitem', { name: /Copy entire action/ }).click();
      await expect(scope).toBeFocused();
      await expect
        .poll(async () => JSON.parse(await page.evaluate(() => navigator.clipboard.readText())))
        .toMatchObject({ nodeId: 'Scope-copy', isScopeNode: true, serializedOperation: before.definition.actions.Scope });
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await expect(page.locator('.react-flow__edgeupdater')).toHaveCount(0);
    });

    test('preserves actual operation drag and drop with the original metadata and new run-after order', async ({ page }) => {
      await openSharedWorkflow(page, 'Panel', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
      await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
      await waitForViewport(page);
      const target = page.getByTestId('msla-plus-button-initialize_arrayvariable-parse_json');
      await dragOperationToInsertion(page, page.locator('#msla-node-HTTP'), target, true);
      await expect
        .poll(async () => (await getSerializedWorkflowFromStateV2(page)).definition.actions.HTTP.runAfter)
        .toEqual({ Initialize_ArrayVariable: ['SUCCEEDED'] });
      const after = await getSerializedWorkflowFromStateV2(page);
      expect(after.definition.actions.HTTP.inputs).toEqual(before.definition.actions.HTTP.inputs);
      expect(after.definition.actions.HTTP.type).toBe(before.definition.actions.HTTP.type);
      expect(after.definition.actions.Parse_JSON.runAfter).toEqual({ HTTP: ['SUCCEEDED'] });
      expect(after.definition.actions.Initialize_ArrayVariable.runAfter).toEqual(
        before.definition.actions.Initialize_ArrayVariable.runAfter
      );
      expect(after.definition.actions.Filter_array.runAfter).toEqual(before.definition.actions.Filter_array.runAfter);
    });

    test('rejects moving an operation before the variable it actually depends on', async ({ page }) => {
      await openSharedWorkflow(page, 'Panel', flag);
      await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
      await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
      await waitForViewport(page);
      const before = await getSerializedWorkflowFromStateV2(page);
      await dragOperationToInsertion(
        page,
        page.locator('#msla-node-HTTP'),
        page.getByTestId('msla-plus-button-manual-initialize_arrayvariable'),
        false
      );
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });

    test('edits and drags the real note and serializes its content and position without changing operations', async ({ page }) => {
      await openSharedWorkflow(page, 'Notes In Metadata', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const note = page.locator('[data-testid="rf__node-validNote"]');
      await note.locator('.note-drag-handle').click();
      const editor = note.getByRole('textbox');
      await editor.fill('Retained **shared-canvas** note');
      await editor.press('Tab');
      await expect(note.locator('.note-drag-handle')).toContainText('Retained shared-canvas note');
      await waitForViewport(page);
      const handle = note.locator('.note-drag-handle');
      const bounds = await handle.boundingBox();
      if (!bounds) {
        throw new Error('The actual note drag handle must be visible.');
      }
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width / 2 + 70, bounds.y + bounds.height / 2 + 45, { steps: 12 });
      await page.mouse.up();
      await expect
        .poll(async () => (await getSerializedWorkflowFromStateV2(page)).notes.validNote.metadata.position)
        .not.toEqual(before.notes.validNote.metadata.position);
      const after = await getSerializedWorkflowFromStateV2(page);
      expect(after.notes.validNote.content).toBe('Retained **shared-canvas** note');
      expect(after.definition.metadata).toEqual(before.definition.metadata);
      expect(after.definition.actions).toEqual(before.definition.actions);
    });

    test('keeps actual loop monitoring pagination and returns to the original repetition', async ({ page }) => {
      await openSharedWorkflow(page, 'Loops pager', flag);
      await LoadRunFile(page, 'SuccessRun');
      const pager = page.getByTestId('msla-pager-v2-until');
      await expect(pager).toBeVisible();
      const readIndex = () =>
        page.evaluate(
          () =>
            (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().workflow.nodesMetadata.Until
              .runIndex ?? 0
        );
      const original = await readIndex();
      const before = await getSerializedWorkflowFromStateV2(page);
      await pager.getByLabel('Next', { exact: true }).click();
      await expect.poll(readIndex).not.toBe(original);
      await pager.getByLabel('Previous', { exact: true }).click();
      await expect.poll(readIndex).toBe(original);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
    });

    test('retains keyboard viewport, minimap and search controls with shared canvas presentation', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const viewport = page.locator('.react-flow__viewport');
      const before = await viewport.getAttribute('style');
      if (!before) {
        throw new Error('Expected the actual laid-out viewport before zooming.');
      }
      await page.getByRole('button', { name: 'Zoom in', exact: true }).press('Enter');
      await expect(viewport).not.toHaveAttribute('style', before);
      await page.getByRole('button', { name: 'Toggle minimap', exact: true }).press('Enter');
      await expect(page.locator('.react-flow__minimap')).toBeVisible();
      await page.getByRole('button', { name: 'Search workflow actions', exact: true }).press('Enter');
      const search = page.getByRole('dialog', { name: 'Go to operation', exact: true });
      await expect(search).toBeVisible();
      await search.getByPlaceholder('Search for operation').fill('Compose');
      await expect(search.getByRole('list')).toContainText('Compose');
      await page.keyboard.press('Escape');
      await expect(search).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Search workflow actions', exact: true })).toBeFocused();
    });
  });
}
