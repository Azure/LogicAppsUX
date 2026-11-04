import { expect, type Locator, type Page } from '@playwright/test';
import type { AppStore } from '../../../libs/designer-v2/src/lib/core/store';

type DesignerWindow = Window & { DesignerStoreV2: Pick<AppStore, 'getState' | 'dispatch'> };

export async function openSharedWorkflow(page: Page, fixture: string, flag: 'true' | 'false' | 'omitted' = 'true') {
  await page.goto(`/v2${flag === 'omitted' ? '' : `?useSharedNodeUi=${flag}`}`);
  await page.getByText('Local', { exact: true }).click();
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: fixture, exact: true }).click();
  const remember = page.getByRole('checkbox', { name: 'Remember my choice', exact: true });
  await expect(page.locator('.react-flow__node').first().or(remember).first()).toBeVisible();
  if (await remember.isVisible()) {
    await page.getByText('Remember my choice', { exact: true }).click();
    await page.getByRole('button', { name: 'No', exact: true }).click();
  }
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  await page.getByRole('button', { name: 'Toolbox', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
  await waitForViewport(page);
}

export async function waitForViewport(page: Page) {
  let previous: string | null = null;
  await expect
    .poll(
      async () => {
        const current = await page.locator('.react-flow__viewport').getAttribute('style');
        const settled = current !== null && current === previous;
        previous = current;
        return settled;
      },
      { intervals: [200] }
    )
    .toBe(true);
}

export async function dragOperationToInsertion(page: Page, source: Locator, insertion: Locator, canDrop: boolean) {
  const container = await insertion
    .locator('xpath=ancestor::div[parent::div[contains(@class, "react-flow__edgelabel-renderer")]]')
    .elementHandle();
  const bounds = await source.boundingBox();
  if (!container || !bounds) {
    throw new Error('The actual operation and insertion container must be mounted before dragging.');
  }
  await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + 10);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.6 + 10, bounds.y + 20, { steps: 5 });
  const dropTarget = await container.waitForSelector(canDrop ? '.canDrop' : '.cannotDrop', { state: 'visible' });
  if (!dropTarget) {
    throw new Error('The active insertion must render its actual drop restriction.');
  }
  const destination = await dropTarget.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    return { ...point, reachable: element.contains(element.ownerDocument.elementFromPoint(point.x, point.y)) };
  });
  expect(destination.reachable).toBe(true);
  await page.mouse.move(destination.x, destination.y, { steps: 5 });
  await page.mouse.up();
}

export async function setSharedNodeUi(page: Page, enabled: boolean) {
  await page.evaluate((useSharedNodeUi) => {
    const store = (window as DesignerWindow).DesignerStoreV2;
    store.dispatch({
      type: 'designerOptions/initDesignerOptions',
      payload: { ...store.getState().designerOptions, useSharedNodeUi },
    });
  }, enabled);
}

export async function setContextSetting(page: Page, label: string, checked: boolean) {
  await page.getByRole('button', { name: 'Toolbox', exact: true }).click();
  const checkbox = page.getByRole('checkbox', { name: label, exact: true });
  if (!(await checkbox.isVisible())) {
    await page.getByRole('heading', { name: /Context Settings/ }).click();
  }
  if ((await checkbox.isChecked()) !== checked) {
    await page.getByText(label, { exact: true }).click();
  }
  await page.getByRole('button', { name: 'Toolbox', exact: true }).click();
}
