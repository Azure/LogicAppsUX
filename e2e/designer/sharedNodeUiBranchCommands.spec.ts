import { expect, test, type Page } from '@playwright/test';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow } from './utils/sharedNodeUi';

async function readMenuItems(page: Page) {
  return await page
    .locator('[role="menuitem"]')
    .allInnerTexts()
    .then((items) => items.map((item) => item.trim()).filter(Boolean));
}

test.describe('Shared node UI branch lane commands', { tag: ['@mock', '@shared-node-ui'] }, () => {
  test('renames the switch-case key from the edit glyph without mutating case value or branch actions', async ({ page }) => {
    await openSharedWorkflow(page, 'Switch', 'true');
    const before = await getSerializedWorkflowFromStateV2(page);
    const beforeCases = before.definition.actions.Switch.cases;
    const caseIds = Object.keys(beforeCases);
    const firstCaseId = caseIds[0];
    expect(firstCaseId).toBeTruthy();

    const caseCard = page.locator(`[id="msla-node-${firstCaseId}"]`);
    await expect(caseCard).toBeVisible();
    await caseCard.getByRole('button', { name: 'Rename case', exact: true }).click();
    const renameDialog = page.getByRole('dialog', { name: 'Rename case', exact: true });
    await expect(renameDialog).toBeVisible();
    await renameDialog.getByRole('textbox', { name: 'Case name', exact: true }).fill('Renamed case lane');
    await renameDialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(renameDialog).not.toBeVisible();

    await expect
      .poll(async () => Object.keys((await getSerializedWorkflowFromStateV2(page)).definition.actions.Switch.cases))
      .not.toContain(firstCaseId);

    const after = await getSerializedWorkflowFromStateV2(page);
    const afterCases = after.definition.actions.Switch.cases;
    const renamedCaseId = Object.keys(afterCases).find((id) => !beforeCases[id]);
    if (!renamedCaseId) {
      throw new Error('Switch-case rename did not produce a new case key.');
    }
    expect(Object.keys(afterCases)).toHaveLength(caseIds.length);
    expect(afterCases[renamedCaseId].case).toEqual(beforeCases[firstCaseId].case);
    expect(afterCases[renamedCaseId].actions).toEqual(beforeCases[firstCaseId].actions);
    expect(after.definition.actions.Switch.default).toEqual(before.definition.actions.Switch.default);
  });

  test('opens lane-header More actions for switch cases and keeps Default lane protected', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Switch', 'true');
    const ids = { caseId: 'First_Case', defaultId: 'Switch-defaultCase' };
    const before = await getSerializedWorkflowFromStateV2(page);
    const beforeCount = Object.keys(before.definition.actions.Switch.cases).length;

    const caseCard = page.locator(`[id="msla-node-${ids.caseId}"]`);
    await caseCard.getByRole('button', { name: 'More case actions', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: /^Delete\b/ })).toBeVisible();
    await testInfo.attach('switch-case-more-actions', {
      body: JSON.stringify({ items: await readMenuItems(page) }),
      contentType: 'application/json',
    });
    await page.getByRole('menuitem', { name: /^Delete\b/ }).click();
    const deleteDialog = page.getByRole('dialog');
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(deleteDialog).not.toBeVisible();

    await caseCard.getByRole('button', { name: 'More case actions', exact: true }).click();
    await page.getByRole('menuitem', { name: /^Delete\b/ }).click();
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: /^Delete\b/ }).click();
    await expect(deleteDialog).not.toBeVisible();
    await expect
      .poll(async () => Object.keys((await getSerializedWorkflowFromStateV2(page)).definition.actions.Switch.cases).length)
      .toBe(beforeCount - 1);

    const defaultCard = page.locator(`[id="msla-node-${ids.defaultId}"]`);
    await expect(defaultCard.getByRole('button', { name: 'Rename case', exact: true })).toHaveCount(0);
    await expect(defaultCard.getByRole('button', { name: 'More case actions', exact: true })).toHaveCount(0);
  });

  test('hides shared lane-header branch commands when the shared flag is off', async ({ page }) => {
    await openSharedWorkflow(page, 'Switch', 'false');
    const caseCard = page.locator('[id="msla-node-First_Case"]');
    await expect(caseCard).toBeVisible();
    await expect(caseCard.getByRole('button', { name: 'Rename case', exact: true })).toHaveCount(0);
    await expect(caseCard.getByRole('button', { name: 'More case actions', exact: true })).toHaveCount(0);
  });
});
