import { baseUrl } from '../utils';
import { test } from '@playwright/test';

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
});
