import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'UnicodeCharacter Tests',
  {
    tag: '@mock',
  },
  async () => {
    test('Actions with unicode character names are deserialized and rendered properly', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Unicode Keys');

      const actionNames = ['Groß-/Kleinbuchstaben', '🐞🍋🐠', '早上好', 'トで読み込み中'];
      for (const actionName of actionNames) {
        await expect(page.getByLabel(actionName, { exact: true })).toBeVisible();
      }
    });
  }
);
