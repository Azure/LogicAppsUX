import { baseUrl } from '../utils';
import { test, expect } from '@playwright/test';

test('Should serialize the workflow after deserializing it and match', async ({ page }) => {
  await page.goto(baseUrl);

  await page.locator('[aria-label="Close React Query Devtools"]').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();
  await page.locator('text=Simple Big Workflow').click();

  await page.locator('button[role="option"]:has-text("Panel")').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();

  const serialized: any = await page.evaluate(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const state = (window as any).DesignerStore.getState();
        console.log(JSON.stringify(state, null, 2));
        resolve((window as any).DesignerModule.serializeBJSWorkflow(state));
      }, 2000);
    });
  });

  const mock = await import('../../../../__mocks__/workflows/Panel.json');

  expect({ connectionReferences: {}, parameters: {}, definition: mock.default.definition }).toEqual(serialized as any);
});
