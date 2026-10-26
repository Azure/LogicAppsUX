import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'Designer notes tests',
  {
    tag: '@mock',
  },
  async () => {
    test('Note controls appear on hover and keyboard focus', async ({ page }) => {
      await page.goto('/v2');
      await page.getByText('Local', { exact: true }).waitFor({ state: 'visible', timeout: 3 * 60 * 1000 });
      await GoToMockWorkflow(page, 'Notes In Metadata');

      const note = page.locator('[data-testid="rf__node-validNote"]');
      const buttons = note.getByRole('button');
      const toolbar = buttons.first().locator('..');

      await page.mouse.move(0, 0);
      await expect(buttons).toHaveCount(2);
      await expect(toolbar).toHaveCSS('opacity', '0');
      await expect(toolbar).toHaveCSS('pointer-events', 'none');

      await note.locator('.note-drag-handle').hover();
      await expect(toolbar).toHaveCSS('opacity', '1');
      await expect(toolbar).toHaveCSS('pointer-events', 'auto');

      const noteBounds = await note.boundingBox();
      const toolbarBounds = await toolbar.boundingBox();
      expect(noteBounds).not.toBeNull();
      expect(toolbarBounds).not.toBeNull();
      if (!noteBounds || !toolbarBounds) {
        throw new Error('Note and toolbar must have bounds.');
      }
      await page.mouse.move(toolbarBounds.x + toolbarBounds.width / 2, noteBounds.y + noteBounds.height - 1);
      await page.mouse.move(toolbarBounds.x + toolbarBounds.width / 2, toolbarBounds.y + 6, { steps: 5 });
      await expect(toolbar).toHaveCSS('opacity', '1');

      await buttons.first().click();
      const swatches = page.locator('.fui-SwatchPicker').getByRole('radio');
      await expect(swatches).toHaveCount(6);
      await swatches.first().hover();
      await swatches.first().focus();
      await expect(swatches.first()).toBeFocused();
      await expect(toolbar).toHaveCSS('opacity', '1');
      await expect(toolbar).toHaveCSS('pointer-events', 'auto');
      await swatches.nth(1).click();
      await expect(note.locator('.note-drag-handle').locator('..')).toHaveCSS('background-color', 'rgb(204, 229, 255)');
      await expect(toolbar).toHaveCSS('opacity', '1');
      await page.keyboard.press('Escape');
      await buttons.first().blur();
      await page.mouse.move(0, 0);
      await expect(toolbar).toHaveCSS('opacity', '0');

      await buttons.first().focus();
      await expect(toolbar).toHaveCSS('opacity', '1');
      await page.keyboard.press('Tab');
      await expect(buttons.last()).toBeFocused();
      await expect(toolbar).toHaveCSS('opacity', '1');
      await page.keyboard.press('Enter');
      await expect(note).toHaveCount(0);
    });

    // Regression test for https://github.com/Azure/LogicAppsUX/issues/9466
    test('Malformed entries in definition.metadata.notes do not crash the designer', async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await page.goto('/v2');
      // The v2 route pulls in a large module graph; give the dev server time to serve it.
      await page.getByText('Local', { exact: true }).waitFor({ state: 'visible', timeout: 3 * 60 * 1000 });
      await GoToMockWorkflow(page, 'Notes In Metadata');

      await expect(page.getByTestId('card-check_for_entra_security_alerts')).toBeVisible();
      await expect(page.getByTestId('card-initialize_variable')).toBeVisible();

      // The well-formed note still renders, the arbitrary user content is dropped.
      await expect(page.locator('[data-testid="rf__node-validNote"]')).toBeVisible();
      await expect(page.locator('[data-testid="rf__node-purpose"]')).toHaveCount(0);

      expect(pageErrors).toEqual([]);
    });
  }
);
