import { test, expect } from '@playwright/test';
import { LoadMockDirect } from './utils/GoToWorkflow';

test.describe(
  'UnicodeCharacter Tests',
  {
    tag: '@mock',
  },
  async () => {
    test('Actions with unicode character names are rendered properly', async ({ page }) => {
      await LoadMockDirect(page, 'UnicodeKeys.json');

      const actionNames = ['Http', 'Groß-/Kleinbuchstaben', '🐞🍋🐠', '早上好', 'トで読み込み中'];
      for (const actionName of actionNames) {
        await expect(page.getByText(actionName, { exact: true })).toBeVisible();
      }
    });
  }
);
