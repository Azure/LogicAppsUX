import type { RootState } from '../../../../libs/designer/src/lib/core/store';
import { baseUrl } from '../utils';
import { test, expect } from '@playwright/test';

test('Should be able to drag and drop operations', async ({ page }) => {
  await page.goto(baseUrl);

  await page.locator('[aria-label="Close React Query Devtools"]').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();
  await page.locator('text=Simple Big Workflow').click();

  await page.locator('button[role="option"]:has-text("Simple Big Workflow")').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();
  const originElement = await page.waitForSelector('div[role="button"]:has-text("Increment variable55")');
  const destinationElement = await page.waitForSelector('g:nth-child(51) > .edgebutton-foreignobject > div > .msla-drop-zone-viewmanager2');

  await originElement.hover();
  await page.mouse.down();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const box = (await destinationElement.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await destinationElement.hover();
  await page.mouse.up();

  const currentAppState: RootState = await page.evaluate(() => {
    return (window as any).DesignerStore.getState();
  });

  const obj = {
    Increment_variable55: {
      runAfter: {
        Response: ['Succeeded'],
      },
    },
    Increment_variable: {
      runAfter: {
        Initialize_variable: ['Succeeded'],
      },
    },
    Initialize_variable: {
      runAfter: {
        Increment_variable55: ['SUCCEEDED'],
      },
    },
    Response: {},
  };
  expect(currentAppState.workflow.operations).toMatchObject(obj);
});
