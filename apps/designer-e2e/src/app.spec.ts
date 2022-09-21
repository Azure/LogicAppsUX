import { baseUrl } from './utils';
import { expect, test } from '@playwright/test';

test('should start page', async ({ page }) => {
  await page.goto(baseUrl);

  expect(true).toBeTruthy();
});
