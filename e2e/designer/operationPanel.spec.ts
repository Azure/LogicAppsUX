import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'OperationPanel Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Can select a node to be shown in the operation panel from fresh state', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Left-click on 'Initialize ArrayVariable' node.
      await page.getByTestId('card-initialize_arrayvariable').click();

      // Node panel tab should be open with 'Initialize Variable' action.
      await expect(page.locator('.msla-panel-card-header input#Initialize_ArrayVariable-title')).toBeVisible();
      await expect(page.locator('.msla-panel-card-header button[aria-label="Unpin action"]')).not.toBeVisible();
    });

    test('Can pin a node to operation panel from fresh state', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Right-click on 'Initialize ArrayVariable' node, and select 'Pin' from the menu.
      await page.getByTestId('card-initialize_arrayvariable').click({ button: 'right' });
      await page.getByTestId('msla-pin-menu-option').click();

      // Node panel tab should be open with 'Initialize Variable' action.
      await expect(page.locator('.msla-panel-card-header input#Initialize_ArrayVariable-title')).toBeVisible();
      await expect(page.locator('.msla-panel-card-header button[aria-label="Unpin action"]')).toBeVisible();
    });

    test('Can have both selected and pinned operations open', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Left-click on 'Parse JSON' node.
      await page.getByTestId('card-parse_json').click();

      // Right-click on 'Initialize ArrayVariable' node, and select 'Pin' from the menu.
      await page.getByTestId('card-initialize_arrayvariable').click({ button: 'right' });
      await page.getByTestId('msla-pin-menu-option').click();

      // Node panel tab should be open with 'Parse JSON' node.
      await expect(page.locator('.msla-panel-layout-selected .msla-panel-card-header input#Parse_JSON-title')).toBeVisible();
      await expect(page.locator('.msla-panel-layout-selected .msla-panel-card-header button[aria-label="Unpin action"]')).not.toBeVisible();

      // Node panel tab should also be open with 'Initialize Variable' action pinned.
      await expect(page.locator('.msla-panel-layout-pinned .msla-panel-card-header input#Initialize_ArrayVariable-title')).toBeVisible();
      await expect(page.locator('.msla-panel-layout-pinned .msla-panel-card-header button[aria-label="Unpin action"]')).toBeVisible();
    });

    test('Can switch between different tabs independently in selected/pinned panels', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');

      // Left-click on 'Parse JSON' node.
      await page.getByTestId('card-parse_json').click();

      // Right-click on 'Initialize ArrayVariable' node, and select 'Pin' from the menu.
      await page.getByTestId('card-initialize_arrayvariable').click({ button: 'right' });
      await page.getByTestId('msla-pin-menu-option').click();

      // Click on 'Settings' tab for 'Parse JSON' and on 'Code view' tab for 'Initialize ArrayVariable'.
      await page.locator('.msla-panel-layout-selected #msla-node-details-panel-Parse_JSON button[value=SETTINGS]').click();
      await page.locator('.msla-panel-layout-pinned #msla-node-details-panel-Initialize_ArrayVariable button[value=CODE_VIEW]').click();

      // Operation panels should have their respective tabs open.
      await expect(page.locator('.msla-panel-layout-selected .msla-setting-section').first()).toBeVisible();
      await expect(page.locator('.msla-panel-layout-pinned .msla-peek')).toBeVisible();
    });
  }
);
