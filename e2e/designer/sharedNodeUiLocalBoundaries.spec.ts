import { expect, test } from '@playwright/test';
import type { AppStore } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow, waitForViewport } from './utils/sharedNodeUi';

for (const flag of ['true', 'false'] as const) {
  test.describe(`Local command boundaries, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('deletes the actual trigger and replaces it through discovery while retaining all actions', async ({ page }) => {
      await openSharedWorkflow(page, 'Scope', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await page.locator('#msla-node-manual').click({ button: 'right' });
      await page.getByRole('menuitem', { name: /^Delete\b/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.locator('#msla-node-manual')).toHaveCount(0);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.triggers).toEqual({});
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await page
        .getByRole('button', {
          name: flag === 'true' ? 'Add a trigger to start your workflow' : 'Add trigger',
          exact: true,
        })
        .press('Enter');
      await page.getByRole('searchbox', { name: 'Search for a trigger', exact: true }).fill('recurrence');
      await page.getByLabel('Recurrence', { exact: true }).click();
      await expect
        .poll(async () => Object.values((await getSerializedWorkflowFromStateV2(page)).definition.triggers).map((trigger) => trigger.type))
        .toEqual(['Recurrence']);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    });

    test('deletes a complete actual Scope subgraph through confirmation and restores it with Undo', async ({ page }) => {
      await openSharedWorkflow(page, 'Scope', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      expect(Object.keys(before.definition.actions.Scope.actions).length).toBeGreaterThan(0);
      await page.locator('#msla-node-Scope').click({ button: 'right' });
      await page.getByRole('menuitem', { name: /^Delete\b/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.locator('#msla-node-Scope')).toHaveCount(0);
      const after = await getSerializedWorkflowFromStateV2(page);
      expect(after.definition.actions.Scope).toBeUndefined();
      expect(after.definition.triggers).toEqual(before.definition.triggers);
      for (const [id, action] of Object.entries(before.definition.actions)) {
        if (id !== 'Scope' && id !== 'Response') {
          expect(after.definition.actions[id]).toEqual(action);
        }
      }
      expect(after.definition.actions.Response).toEqual({
        ...before.definition.actions.Response,
        runAfter: before.definition.actions.Scope.runAfter,
      });
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await expect(page.locator('#msla-node-Scope')).toHaveCount(1);
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    });

    test('uses the actual pane menu and persists note drag coordinates on the twenty-unit snap grid', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'Notes In Metadata', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await page.locator('.react-flow__pane').click({ button: 'right', position: { x: 40, y: 80 } });
      const items = await page.getByRole('menuitem').allTextContents();
      expect(items).toEqual(['Add note']);
      await testInfo.attach('pane-command-boundary', {
        body: JSON.stringify({ items, limit: 'Existing pane exposes Add note only, not a manual Arrange command' }),
        contentType: 'application/json',
      });
      await page.getByRole('menuitem', { name: 'Add note', exact: true }).click();
      await expect(page.locator('.react-flow__node-NOTE_NODE')).toHaveCount(Object.keys(before.notes).length + 1);
      const newId = await page.evaluate(
        (ids) =>
          Object.keys((window as Window & { DesignerStoreV2: Pick<AppStore, 'getState'> }).DesignerStoreV2.getState().notes.notes).find(
            (id) => !ids.includes(id)
          ),
        Object.keys(before.notes)
      );
      if (!newId) {
        throw new Error('The pane command must create a real note identity.');
      }
      await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
      await waitForViewport(page);
      const newNote = page.locator(`[data-testid="rf__node-${newId}"]`);
      await newNote.locator('.note-drag-handle').click();
      await newNote.getByRole('textbox').fill('Actual pane-menu note');
      await newNote.getByRole('textbox').press('Tab');
      expect((await getSerializedWorkflowFromStateV2(page)).notes[newId].content).toBe('Actual pane-menu note');
      await newNote.locator('.msla-note-toolbar button').last().click();
      await expect(newNote).toHaveCount(0);
      const note = page.locator('[data-testid="rf__node-validNote"] .note-drag-handle');
      const bounds = await note.boundingBox();
      if (!bounds) {
        throw new Error('The existing actual note must be visible before testing native snap.');
      }
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width / 2 + 79, bounds.y + bounds.height / 2 + 53, { steps: 12 });
      await page.mouse.up();
      await expect
        .poll(async () => (await getSerializedWorkflowFromStateV2(page)).notes.validNote.metadata.position)
        .not.toEqual(before.notes.validNote.metadata.position);
      const after = await getSerializedWorkflowFromStateV2(page);
      expect(Math.abs(after.notes.validNote.metadata.position.x % 20)).toBe(0);
      expect(Math.abs(after.notes.validNote.metadata.position.y % 20)).toBe(0);
      expect(after.notes.validNote.content).toBe(before.notes.validNote.content);
      expect(after.definition).toEqual(before.definition);
    });

    test('retains the accepted maximum-length title, stable node identity and fixed card bounds after rename', async ({
      page,
    }, testInfo) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const card = page.locator('#msla-node-Init_all');
      const width = await card.evaluate((element) => element.getBoundingClientRect().width);
      await card.press('Enter');
      const title = page.getByRole('textbox', { name: 'Card title', exact: true });
      const longTitle = 'Long readable operation name '.repeat(8).trim();
      await expect(title).toHaveAttribute('maxlength', '80');
      await title.fill(longTitle);
      await expect(title).toHaveValue(longTitle.slice(0, 80));
      await title.press('Tab');
      await expect(card).toHaveAccessibleName(new RegExp(longTitle.slice(0, 80)));
      await page.getByTestId('msla-panel-header-close-nav').click();
      await waitForViewport(page);
      expect(await card.evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(width, 1);
      const renamed = await getSerializedWorkflowFromStateV2(page);
      const key = Object.keys(renamed.definition.actions).find((id) => !before.definition.actions[id]);
      expect(key).toBeDefined();
      expect(renamed.definition.actions[key!]).toEqual(before.definition.actions.Init_all);
      await page.screenshot({ path: testInfo.outputPath('long-title.png'), animations: 'disabled' });
      await card.press('Enter');
      await title.fill('Init all');
      await title.press('Tab');
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });

    test('audits the existing native locale selector and unsupported RTL and orientation controls', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await page.getByRole('button', { name: 'Toolbox', exact: true }).click();
      await page.getByRole('heading', { name: /Locale/ }).click();
      const language = page.getByRole('combobox', { name: /^Language\b/ });
      await language.click();
      const choices = await page.getByRole('option').allTextContents();
      expect(choices).toEqual(['English', 'Chinese', 'Japanese', 'Korean', 'German', 'French', 'Indonesian', 'Test Language (en-XA)']);
      await page.getByRole('option', { name: 'German', exact: true }).click();
      await expect(language).toContainText('German');
      await page.getByRole('button', { name: 'Toolbox', exact: true }).click();
      await waitForViewport(page);
      await expect(page.locator('#msla-node-Compose')).toBeVisible();
      const labels = await page
        .locator('.react-flow__controls button')
        .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
      expect(labels.length).toBeGreaterThan(0);
      expect(labels.every((label) => !!label)).toBe(true);
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
      await page.getByRole('button', { name: 'Toolbox', exact: true }).click();
      await page.getByRole('heading', { name: /Locale/ }).click();
      await language.click();
      await page.getByRole('option', { name: 'English', exact: true }).click();
      await expect(language).toContainText('English');
      await page.getByRole('heading', { name: /Context Settings/ }).click();
      await expect(page.getByRole('checkbox', { name: 'Read Only', exact: true })).toBeVisible();
      const settings = await page
        .getByRole('checkbox')
        .evaluateAll((checkboxes) =>
          checkboxes.map((checkbox) => checkbox.getAttribute('aria-label') ?? checkbox.parentElement?.textContent)
        );
      expect(settings.some((label) => /orientation|clamp|right.to.left|RTL/i.test(label ?? ''))).toBe(false);
      await page.getByRole('button', { name: 'Toolbox', exact: true }).click();
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
      await testInfo.attach('native-locale-control-boundary', {
        body: JSON.stringify({
          choices,
          labels,
          settings,
          limit:
            'Actual German/English selector with named controls and unchanged definition, not complete translation or RTL acceptance. Existing host offers no RTL language, orientation or clamp selector.',
        }),
        contentType: 'application/json',
      });
    });
  });
}
